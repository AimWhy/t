/****************** util.js *********************/
const raceMap = new Map();
export const genRaceIdByKey = function (key) {
    const raceId = raceMap.get(key) || 1;
    const newRaceId = raceId + 1;
    raceMap.set(key, newRaceId);
    return [key, newRaceId];
}

export const checkRaceIdByKey = function ([key, requestRaceId]) {
    const raceId = raceMap.get(key);
    return raceId === requestRaceId;
}

/********************* request.js *********************/

export function sendRequest({ method, url, data }) {
    return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.send(data);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                if ('raceKey' in data && checkRaceIdByKey(data.raceKey)) {
                    reject('raceKey check failed');
                    return;
                }
                resolve(xhr.responseText);
            }
        }
    });
}

/********************* BusinessModel.js  不变*********************/

export function fetchUserInfo(data) {
    return sendRequest({
        method: 'GET',
        url: 'https://api.github.com/users/octocat',
        data: data,
    });
}

/********************* Abc.vue *********************/

function getUserList() {
    fetchUserInfo({
        age: 18,
        sex: 'male',
        // 仅控制下一行, 不用变其他层， for_test 要保存唯一
        raceKey: genRaceIdByKey('for_test'),
    }).then(res => {
        console.log(res);
    }).catch(err => {
        console.log(err);
    })
}