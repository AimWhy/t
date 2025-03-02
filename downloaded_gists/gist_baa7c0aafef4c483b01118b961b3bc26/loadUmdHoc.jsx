// 封装记载umd模块的hoc
  function loadUmdHoc(Comp: (props) => JSX.Element, src: string) {
    return function Hoc(props) {
      const [isLoaded, setLoaded] = useState(
        !!Array.from(document.body.getElementsByTagName('script')).filter(
          (item) => item.src.match(src)
        ).length
      )
      useEffect(() => {
        if (isLoaded) return
        const script = document.createElement('script')
        script.src = src
        script.onload = () => {
          setLoaded(true)
        }
        document.body.append(script)
      }, [])

      if (isLoaded) {
        return <Comp {...props} />
      }
      return <></>
    }
  }

  function Upload(){
    // todo 使用umd模块
    return <></>
  }

  // 使用该组件时，加载hoc
  export default loadUmdHoc(
    Upload,
    'xxx.umd.js'
  )