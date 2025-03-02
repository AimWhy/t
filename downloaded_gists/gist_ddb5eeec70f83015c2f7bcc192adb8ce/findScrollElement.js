  function findScrollElement({clientX,clientY}, direction) {
    const stack = document.elementsFromPoint(clientX, clientY); 
    const test = direction == VERTICAL ? 
      el => el.scrollHeight - el.clientHeight :
      el => el.scrollWidth - el.clientWidth;
    if ( ! stack ) return err({noStack:true});
    let maxDiff = 0;
    let scrollElement;
    for( const el of stack ) {
      const diff = test(el);
      if ( !! diff && diff >= maxDiff ) {
        scrollElement = el;
        maxDiff = diff;
      }
    }
    return {scrollElement, topElement: stack[0]};
  }