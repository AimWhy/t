const activeJobs = {}

function serializeActiveJob(groupName, jobFun) {
  return new Promise((resolve, reject) => {
    if (!activeJobs[groupName]) {
      activeJobs[groupName] = []
    }

    const resolveValue = () => {
      try {
        // jobFun() 为 Promise 类型，需包裹一层、否则会等待其结束
        resolve([jobFun()])
      } catch (err) {
        reject(err)
      }
    };

    activeJobs[groupName].push(resolveValue)

    if (activeJobs[groupName].length === 1) {
      resolveValue()
    }
  })
}

async function runJob(groupName, jobFun) {
  try {
    const [result] = await serializeActiveJob(groupName, jobFun);
    const jobResult = await result;

    console.log(jobResult);
  } catch (e) {
    console.error(e)
  } finally { 
    activeJobs[groupName].shift()

    if (activeJobs[groupName].length > 0) {
      activeJobs[groupName][0]()
    } else {
      delete activeJobs[groupName]
    }
  }
}