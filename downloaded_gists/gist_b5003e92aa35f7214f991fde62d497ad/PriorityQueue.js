export const DROP = Infinity;

class PriorityQueue {
  constructor(priorityFunction, keyFunction) {
    this.priorityFunction_ = priorityFunction;
    this.keyFunction_ = keyFunction;
    this.elements_ = [];
    this.priorities_ = [];
    this.queuedElements_ = {};
  }

  clear() {
    this.elements_.length = 0;
    this.priorities_.length = 0;
    this.queuedElements_ = {};
  }

  dequeue() {
    const elements = this.elements_;
    const priorities = this.priorities_;
    const element = elements[0];
    if (elements.length === 1) {
      elements.length = 0;
      priorities.length = 0;
    } else {
      elements[0] = elements.pop();
      priorities[0] = priorities.pop();
      this.siftUp_(0);
    }
    const elementKey = this.keyFunction_(element);
    delete this.queuedElements_[elementKey];
    return element;
  }

  enqueue(element) {
    const priority = this.priorityFunction_(element);
    if (priority !== DROP) {
      this.elements_.push(element);
      this.priorities_.push(priority);
      this.queuedElements_[this.keyFunction_(element)] = true;
      this.siftDown_(0, this.elements_.length - 1);
      return true;
    }
    return false;
  }

  getCount() {
    return this.elements_.length;
  }

  getLeftChildIndex_(index) {
    return index * 2 + 1;
  }

  getRightChildIndex_(index) {
    return index * 2 + 2;
  }

  getParentIndex_(index) {
    return (index - 1) >> 1;
  }

  _heapify() {
    let i;
    for (i = (this.elements_.length >> 1) - 1; i >= 0; i--) {
      this.siftUp_(i);
    }
  }

  isEmpty() {
    return this.elements_.length === 0;
  }

  isKeyQueued(key) {
    return key in this.queuedElements_;
  }

  isQueued(element) {
    return this.isKeyQueued(this.keyFunction_(element));
  }

  siftUp_(index) {
    const elements = this.elements_;
    const priorities = this.priorities_;
    const count = elements.length;
    const element = elements[index];
    const priority = priorities[index];
    const startIndex = index;

    while (index < count >> 1) {
      const lIndex = this.getLeftChildIndex_(index);
      const rIndex = this.getRightChildIndex_(index);

      const smallerChildIndex =
        rIndex < count && priorities[rIndex] < priorities[lIndex] ? rIndex : lIndex;

      elements[index] = elements[smallerChildIndex];
      priorities[index] = priorities[smallerChildIndex];
      index = smallerChildIndex;
    }

    elements[index] = element;
    priorities[index] = priority;
    this.siftDown_(startIndex, index);
  }

  siftDown_(startIndex, index) {
    const elements = this.elements_;
    const priorities = this.priorities_;
    const element = elements[index];
    const priority = priorities[index];

    while (index > startIndex) {
      const parentIndex = this.getParentIndex_(index);
      if (priorities[parentIndex] > priority) {
        elements[index] = elements[parentIndex];
        priorities[index] = priorities[parentIndex];
        index = parentIndex;
      } else {
        break;
      }
    }
    elements[index] = element;
    priorities[index] = priority;
  }

  reprioritize() {
    const priorityFunction = this.priorityFunction_;
    const elements = this.elements_;
    const priorities = this.priorities_;
    let index = 0;
    const n = elements.length;
    let element;
    let i;
    let priority;
    for (i = 0; i < n; ++i) {
      element = elements[i];
      priority = priorityFunction(element);
      if (priority === DROP) {
        delete this.queuedElements_[this.keyFunction_(element)];
      } else {
        priorities[index] = priority;
        elements[index++] = element;
      }
    }
    elements.length = index;
    priorities.length = index;
    this._heapify();
  }
}

export default PriorityQueue;
