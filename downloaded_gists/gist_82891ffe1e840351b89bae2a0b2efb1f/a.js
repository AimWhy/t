// toolchain
// 错误捕获
__webpack_SEF_helper__.wait(function({hookManager}){
  if(!hookManager.isSlotRegisted('javascriptError')){
    hookManager.registSlot('javascriptError')
  }
});

// publicPath 修正
__webpack_SEF_helper__.wait(function({hookManager}){
  if(!hookManager.isSlotRegisted('publicPath')){
    hookManager.registSlot('publicPath')
  }
  ${generatedModuleInfoCode()}
});