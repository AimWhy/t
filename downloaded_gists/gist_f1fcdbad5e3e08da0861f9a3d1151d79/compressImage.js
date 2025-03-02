function createObjectURL(file) {
  const URL = window.URL || window.webkitURL || window.mozURL;
  // FIXME:  需要 revokeObjectURL
  return URL.createObjectURL(file);
}

const mimeTypes = {
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  WEBP: 'image/webp',
  BMP: 'image/bmp'
};
const maxSteps = 4;
const scaleFactor = Math.log(2);
const supportMimeTypes = Object.keys(mimeTypes).map(type => mimeTypes[type]);
const defaultType = mimeTypes.JPEG;
function isSupportedType(type) {
  return supportMimeTypes.includes(type);
}
class Compress {
  constructor(file, config) {
    this.file = file;
    this.config = config;
    this.config = {
      quality: 0.92,
      noCompressIfLarger: false,
      ...this.config
    };
  }
  async process() {
    this.outputType = this.file.type;
    const srcDimension = {};
    if (!isSupportedType(this.file.type)) {
      throw new Error(`unsupported file type: ${this.file.type}`);
    }
    const originImage = await this.getOriginImage();
    const canvas = await this.getCanvas(originImage);
    let scale = 1;
    if (this.config.maxWidth) {
      scale = Math.min(1, this.config.maxWidth / canvas.width);
    }
    if (this.config.maxHeight) {
      scale = Math.min(1, scale, this.config.maxHeight / canvas.height);
    }
    srcDimension.width = canvas.width;
    srcDimension.height = canvas.height;
    const scaleCanvas = await this.doScale(canvas, scale);
    const distBlob = this.toBlob(scaleCanvas);
    if (distBlob.size > this.file.size && this.config.noCompressIfLarger) {
      return {
        dist: this.file,
        width: srcDimension.width,
        height: srcDimension.height
      };
    }
    return {
      dist: distBlob,
      width: scaleCanvas.width,
      height: scaleCanvas.height
    };
  }
  clear(ctx, width, height) {
    // jpeg 没有 alpha 通道，透明区间会被填充成黑色，这里把透明区间填充为白色
    if (this.outputType === defaultType) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }
  }
  /** 通过 file 初始化 image 对象 */
  getOriginImage() {
    return new Promise((resolve, reject) => {
      const url = createObjectURL(this.file);
      const img = new Image();
      img.onload = () => {
        resolve(img);
      };
      img.onerror = () => {
        reject('image load error');
      };
      img.src = url;
    });
  }
  getCanvas(img) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('context is null'));
        return;
      }
      const { width, height } = img;
      canvas.height = height;
      canvas.width = width;
      this.clear(context, width, height);
      context.drawImage(img, 0, 0);
      resolve(canvas);
    });
  }
  async doScale(source, scale) {
    if (scale === 1) {
      return source;
    }
    // 不要一次性画图，通过设定的 step 次数，渐进式的画图，这样可以增加图片的清晰度，防止一次性画图导致的像素丢失严重
    const sctx = source.getContext('2d');
    const steps = Math.min(maxSteps, Math.ceil((1 / scale) / scaleFactor));
    const factor = scale ** (1 / steps);
    const mirror = document.createElement('canvas');
    const mctx = mirror.getContext('2d');
    let { width, height } = source;
    const originWidth = width;
    const originHeight = height;
    mirror.width = width;
    mirror.height = height;
    if (!mctx || !sctx) {
      throw new Error('mctx or sctx can\'t be null');
    }
    let src;
    let context;
    for (let i = 0; i < steps; i++) {
      let dw = width * factor | 0; // eslint-disable-line no-bitwise
      let dh = height * factor | 0; // eslint-disable-line no-bitwise
      // 到最后一步的时候 dw, dh 用目标缩放尺寸，否则会出现最后尺寸偏小的情况
      if (i === steps - 1) {
        dw = originWidth * scale;
        dh = originHeight * scale;
      }
      if (i % 2 === 0) {
        src = source;
        context = mctx;
      } else {
        src = mirror;
        context = sctx;
      }
      // 每次画前都清空，避免图像重叠
      this.clear(context, width, height);
      context.drawImage(src, 0, 0, width, height, 0, 0, dw, dh);
      width = dw;
      height = dh;
    }
    const canvas = src === source ? mirror : source;
    // save data
    const data = context.getImageData(0, 0, width, height);
    // resize
    canvas.width = width;
    canvas.height = height;
    // store image data
    context.putImageData(data, 0, 0);
    return canvas;
  }
  /** 这里把 base64 字符串转为 blob 对象 */
  toBlob(result) {
    const dataURL = result.toDataURL(this.outputType, this.config.quality);
    const buffer = atob(dataURL.split(',')[1]).split('').map(char => char.charCodeAt(0));
    const blob = new Blob([new Uint8Array(buffer)], { type: this.outputType });
    return blob;
  }
}
const compressImage = (file, options) => new Compress(file, options).process();
export default compressImage;
