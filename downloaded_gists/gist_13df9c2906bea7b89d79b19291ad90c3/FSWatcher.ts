import chokidar from 'chokidar';
import type { FSWatcher } from 'chokidar';

export type FSEvent = { event: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir', file: string };

export class Watcher {
  private _onChange: (events: FSEvent[]) => void;
  private _watchedFiles: string[] = [];
  private _ignoredFolders: string[] = [];
  private _collector: FSEvent[] = [];
  private _fsWatcher: FSWatcher | undefined;
  private _throttleTimer: NodeJS.Timeout | undefined;
  private _mode: 'flat' | 'deep';

  constructor(mode: 'flat' | 'deep', onChange: (events: FSEvent[]) => void) {
    this._mode = mode;
    this._onChange = onChange;
  }

  update(watchedFiles: string[], ignoredFolders: string[], reportPending: boolean) {
    if (JSON.stringify([this._watchedFiles, this._ignoredFolders]) === JSON.stringify(watchedFiles, ignoredFolders))
      return;

    if (reportPending)
      this._reportEventsIfAny();

    this._watchedFiles = watchedFiles;
    this._ignoredFolders = ignoredFolders;
    void this._fsWatcher?.close();
    this._fsWatcher = undefined;
    this._collector.length = 0;
    clearTimeout(this._throttleTimer);
    this._throttleTimer = undefined;

    if (!this._watchedFiles.length)
      return;

    this._fsWatcher = chokidar.watch(watchedFiles, { ignoreInitial: true, ignored: this._ignoredFolders }).on('all', async (event, file) => {
      if (this._throttleTimer)
        clearTimeout(this._throttleTimer);
      if (this._mode === 'flat' && event !== 'add' && event !== 'change')
        return;
      if (this._mode === 'deep' && event !== 'add' && event !== 'change' && event !== 'unlink' && event !== 'addDir' && event !== 'unlinkDir')
        return;
      this._collector.push({ event, file });
      this._throttleTimer = setTimeout(() => this._reportEventsIfAny(), 250);
    });
  }

  private _reportEventsIfAny() {
    if (this._collector.length)
      this._onChange(this._collector.slice());
    this._collector.length = 0;
  }
}