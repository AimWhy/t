import axios from 'axios';
import { setToken, setRefreshToken, getToken, getRefreshToken } from './token';

const ins = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: {
        Authorization: `Bearer ${getToken()}`
    }
});

ins.interceptors.response.use(async (res) => {
    if (res.headers.authorization) {
        const token = res.headers.authorization.split(' ')[1];
        setToken(token);
        ins.defaults.headers.Authorization = `Bearer ${token}`;
    }

    if (res.headers.refreshtoken) {
        const refreshtoken = res.headers.refreshtoken.split(' ')[1];
        setRefreshToken(refreshtoken);
    }
    
    if (res.data.code === 401 && !isRefreshRequest(res.config)) {
        const isOk = await getNewToken();
        if (isOk) {
            res.config.headers.Authorization = `Bearer ${getToken()}`;
            const resp = await ins.request(res.config);
            return resp.data;
        } else {
            return console.log("跳转到登录页面");
        }
    }

    return res.data;
})

let preGetToken = null;
export async function getNewToken() {
    if (!preGetToken) {
        preGetToken = ins.get('/newToken', {
            headers: {
                Authorization: `Bearer ${getRefreshToken()}`
            },
            __isRefreshToken: true
        })
    }

    try {
        const resp = await preGetToken;
        return resp.code === 0
    } finally {
        preGetToken = null;
    }
}
export function isRefreshRequest(config) {
    return config && config.__isRefreshToken;
}

export default ins;