function transformGroupNames(channelList, mapping) {
    return channelList.map(function (channel) {
        var newGroupName = mapping[channel.groupName] || channel.groupName;
        return Object.assign({}, channel, { groupName: newGroupName });
    });
}
function sortChannelsByGroupName(channelList, sort) {
    return channelList.map(function (channel, index) {
            return { channel: channel, originalIndex: index };
        }).sort(function (a, b) {
            var indexA = sort.indexOf(a.channel.groupName);
            var indexB = sort.indexOf(b.channel.groupName);
            indexA = indexA === -1? sort.length : indexA;
            indexB = indexB === -1? sort.length : indexB;
            return indexA - indexB || a.originalIndex - b.originalIndex;
        }).map(function (item) {
            return item.channel;
        });
}
function transformChannelList(channelList, func) {
    return channelList.map(function (channel) {
        var transformedChannel = func(channel);
        return Object.assign({}, channel, transformedChannel);
    });
}
function filterOutChannels(channelList, filterOutChannelNameList) {
    return channelList.filter(function (channel) {
        return filterOutChannelNameList.indexOf(channel.name) === -1;
    });
}
function main(channelList) {
    var groupNameMapping = {
        '北京': '卫视',
        '安徽': '卫视',
        '甘肃': '卫视',
        '广东': '卫视',
        '贵州': '卫视',
        '海南': '卫视',
        '河北': '卫视',
        '河南': '卫视',
        '黑龙江': '卫视',
        '湖北': '卫视',
        '湖南': '卫视',
        '吉林': '卫视',
        '江苏': '卫视',
        '江西': '卫视',
        '辽宁': '卫视',
        '青海': '卫视',
        '山东': '卫视',
        '上海': '卫视',
        '四川': '卫视',
        '云南': '卫视',
        '浙江': '卫视',
        '重庆': '卫视',
        '香港': '卫视',
        '4K频道': '4K 8K',
        '8K频道': '4K 8K'
    };
    var groupNameSort = ['央视', '卫视', '4K 8K', 'NEWTV', 'IHOT', '其他'];
    var filterOutChannelNameList = ["4K60PSDR-H264-AAC测试", "4K60PHLG-HEVC-EAC3测试", "北京纪实科教8K", "重温经典"];
    var unwantedGroupNames = ["列表更新时间"];
    function transformChannel(channel) {}
    channelList = channelList.filter(function (channel) {
        return unwantedGroupNames.indexOf(channel.groupName) === -1;
    });
    return sortChannelsByGroupName(transformGroupNames(transformChannelList(filterOutChannels(channelList, filterOutChannelNameList), transformChannel), groupNameMapping), groupNameSort);
}