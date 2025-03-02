function FindProxyForURL(url, host) {

    // 可以使用字符串处理
    if (!host.endsWith(".aimwhy.us.kg")) {
        return `PROXY ${host.replaceAll('.', '__x__')}.aimwhy.us.kg`;
    }

    // 其他域名直连
    return "DIRECT";
}