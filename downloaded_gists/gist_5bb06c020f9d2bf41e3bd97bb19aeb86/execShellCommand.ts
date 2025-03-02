function execShellCommand(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      cmd,
      {
        env: {
          ...process.env,
          PATH: `${process.env.PATH}${delimiter}${process.cwd()}${sep}node_modules${sep}.bin`,
        },
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
          // eslint-disable-next-line no-console
          console.error(error);
        } else {
          debugLog(stdout || stderr);
          resolve(stdout || stderr);
        }
      }
    );
  });
}

async function executeHooks(
  hookName: string,
  _scripts: Types.LifeCycleHookValue | Types.LifeCycleAlterHookValue = [],
  args: string[] = [],
  initialState?: string
): Promise<void | string> {
  debugLog(`Running lifecycle hook "${hookName}" scripts...`);
  let state = initialState;
  const scripts = Array.isArray(_scripts) ? _scripts : [_scripts];

  const quotedArgs = quote(args);
  for (const script of scripts) {
    if (typeof script === 'string') {
      debugLog(`Running lifecycle hook "${hookName}" script: ${script} with args: ${quotedArgs}...`);
      await execShellCommand(`${script} ${quotedArgs}`);
    } else {
      debugLog(`Running lifecycle hook "${hookName}" script: ${script.name} with args: ${args.join(' ')}...`);
      const hookArgs = state === undefined ? args : [...args, state];
      const hookResult = await script(...hookArgs);
      if (typeof hookResult === 'string' && typeof state === 'string') {
        debugLog(`Received new content from lifecycle hook "${hookName}" script: ${script.name}`);
        state = hookResult;
      }
    }
  }

  return state;
}