const JYS = window.JYS = window.JYS || {};

JYS.Image = {
  MAX_SIZE: 2 * 1024 * 1024,
  COMPRESS_QUALITY: 0.85,
  MAX_WIDTH: 1440,
  MAX_HEIGHT: 2560,

  compressImage: function(file, options) {
    options = options || {};
    var quality = options.quality || this.COMPRESS_QUALITY;
    var maxWidth = options.maxWidth || this.MAX_WIDTH;
    var maxHeight = options.maxHeight || this.MAX_HEIGHT;

    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          var w = img.width, h = img.height;
          if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
          if (h > maxHeight) { w = Math.round(w * maxHeight / h); h = maxHeight; }

          var canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);

          canvas.toBlob(function(blob) {
            if (blob && blob.size < file.size) {
              resolve(blob);
            } else {
              resolve(file);
            }
          }, 'image/jpeg', quality);
        };
        img.onerror = function() { resolve(file); };
        img.src = e.target.result;
      };
      reader.onerror = function() { resolve(file); };
      reader.readAsDataURL(file);
    });
  },

  blobToDataUrl: function(blob) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function(e) { resolve(e.target.result); };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },

  uploadImage: function(file) {
    var self = this;
    return this.compressImage(file).then(function(blob) {
      return self.blobToDataUrl(blob);
    }).catch(function() {
      return self.blobToDataUrl(file);
    });
  },

  chooseImage: function(options) {
    options = options || {};
    var count = options.count || 1;
    var accept = options.accept || 'image/*';
    var multiple = count > 1;

    return new Promise(function(resolve) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      if (multiple) input.multiple = true;
      input.style.display = 'none';
      document.body.appendChild(input);

      input.onchange = function() {
        var files = Array.from(input.files).slice(0, count);
        document.body.removeChild(input);
        resolve(files);
      };

      input.oncancel = function() {
        document.body.removeChild(input);
        resolve([]);
      };

      setTimeout(function() {
        var cancelled = false;
        input.onblur = function() {
          if (!input.files || input.files.length === 0) {
            cancelled = true;
          }
        };
        window.addEventListener('focus', function() {
          if (cancelled) {
            document.body.removeChild(input);
            resolve([]);
          }
        }, { once: true });
      }, 100);

      input.click();
    });
  }
};