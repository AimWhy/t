/**
  * Usage:
    asyncPoll(
        async (): Promise<AsyncData<any>> => {
            try {
                const result = await getYourAsyncResult();
                if (result.isWhatYouWant) {
                    return Promise.resolve({
                        done: true,
                        data: result,
                    });
                } else {
                    return Promise.resolve({
                        done: false
                    });
                }
            } catch (err) {
                return Promise.reject(err);
            }
        },
        500,    // interval
        15000,  // timeout
    );
  */
 
export function asyncPoll(
  fn,
  pollInterval = 5 * 1000,
  pollTimeout = 30 * 1000
) {
  const endTime = new Date().getTime() + pollTimeout;

  let stop = false;
  const cancel = () => {
    stop = true;
  };

  const checkCondition = (resolve, reject) => {
    Promise.resolve(fn())
      .then((result) => {
        const now = new Date().getTime();
        if (stop) {
          reject(new Error("AsyncPoller: cancelled"));
        } else if (result.done) {
          resolve(result.data);
        } else if (now < endTime) {
          setTimeout(checkCondition, pollInterval, resolve, reject);
        } else {
          reject(new Error("AsyncPoller: reached timeout"));
        }
      })
      .catch((err) => {
        reject(err);
      });
  };
  return [new Promise(checkCondition), cancel];
}
