function parseBody(template) {
    const str = template.replace(/\{\{(.*?)\}\}/g, (match, p1) => {
        return '${' + `context.${p1}` + '}';
    });

    const func = `(context) => {
        return ${str};
    }`

    return `
    const patch = (rNode, vNode) => {
        return vNode;
    };
    const genVNode = ${func};
    return {
        diff(dom) {
            if (typeof dom ==='string') {
                dom = document.querySelector(dom);
            }
            return patch(dom, genVNode(context));
        }
    }`;
}

class Render extends Function {
    constructor(template) {
        const body = parseBody(template)
        super('context', body);
        this.template = template;
    }
}

const render = new Render('`<div>{{name}}</div>`');
render({ name: 22 }).diff('#app');