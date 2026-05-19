var JYS = window.JYS = window.JYS || {};

JYS.Crypto = {
  SALT_LENGTH: 32,
  HASH_ITERATIONS: 10000,
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 128,
  PASSWORD_EXPIRE_DAYS: 90,
  PASSWORD_PATTERNS: {
    hasUpperCase: /[A-Z]/,
    hasLowerCase: /[a-z]/,
    hasDigit: /\d/,
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/
  },

  generateSalt: function() {
    var array = new Uint8Array(this.SALT_LENGTH);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array);
    } else {
      for (var i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array).map(function(b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  },

  arrayBufferToHex: function(buffer) {
    return Array.from(new Uint8Array(buffer)).map(function(b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  },

  stringToUTF8Bytes: function(str) {
    var utf8 = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) {
        utf8.push(c);
      } else if (c < 0x800) {
        utf8.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      } else if (c < 0xd800 || c >= 0xe000) {
        utf8.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      } else {
        i++;
        c = 0x10000 + (((c & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        utf8.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      }
    }
    return new Uint8Array(utf8);
  },

  _sha256: function(messageBytes) {
    var self = this;

    var H = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];

    var K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
      0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
      0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
      0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
      0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
      0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
      0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
      0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
      0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    var l = messageBytes.length * 8;
    var paddedLength = ((l + 64) >> 9 << 4) + 15;
    var padded = new Uint8Array(paddedLength + 1);
    padded.set(messageBytes);
    padded[messageBytes.length] = 0x80;

    var view = new DataView(padded.buffer);
    view.setUint32(paddedLength - 3, Math.floor(l / 0x100000000));
    view.setUint32(paddedLength + 1, l);

    var W = new Array(64);
    for (var offset = 0; offset < paddedLength; offset += 64) {
      for (var t = 0; t < 16; t++) {
        W[t] = view.getUint32(offset + t * 4);
      }
      for (t = 16; t < 64; t++) {
        var s0 = ((W[t - 15] >>> 7) | (W[t - 15] << 25)) ^ ((W[t - 15] >>> 18) | (W[t - 15] << 14)) ^ (W[t - 15] >>> 3);
        var s1 = ((W[t - 2] >>> 17) | (W[t - 2] << 15)) ^ ((W[t - 2] >>> 19) | (W[t - 2] << 13)) ^ (W[t - 2] >>> 10);
        W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
      }

      var a = H[0], b = H[1], c = H[2], d = H[3],
          e = H[4], f = H[5], g = H[6], h = H[7];

      for (t = 0; t < 64; t++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        var ch = (e & f) ^ (~e & g);
        var temp1 = (h + S1 + ch + K[t] + W[t]) | 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var temp2 = (S0 + maj) | 0;

        h = g; g = f; f = e; e = (d + temp1) | 0;
        d = c; c = b; b = a; a = (temp1 + temp2) | 0;
      }

      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0;
      H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0;
      H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }

    var result = '';
    for (var i = 0; i < 8; i++) {
      result += ('0000000' + (H[i] >>> 0).toString(16)).slice(-8);
    }
    return result;
  },

  _hexToBytes: function(hex) {
    var bytes = new Uint8Array(hex.length / 2);
    for (var i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  },

  hashPassword: function(password, salt) {
    var self = this;
    return new Promise(function(resolve, reject) {
      try {
        var result = self._sha256(self.stringToUTF8Bytes(salt + password));

        function iterate(remaining, current) {
          if (remaining <= 0) {
            resolve(current);
            return;
          }
          try {
            var hash = self._sha256(self.stringToUTF8Bytes(current + password));
            setTimeout(function() { iterate(remaining - 1, hash); }, 0);
          } catch (e) {
            resolve(current);
          }
        }

        iterate(self.HASH_ITERATIONS - 1, result);
      } catch (e) {
        resolve(self._sha256(self.stringToUTF8Bytes(salt + password)));
      }
    });
  },

  hashPasswordSync: function(password, salt) {
    var result = this._sha256(this.stringToUTF8Bytes(salt + password));
    for (var i = 1; i < this.HASH_ITERATIONS; i++) {
      result = this._sha256(this.stringToUTF8Bytes(result + password));
    }
    return result;
  },

  verifyPassword: function(password, storedHash, salt) {
    var self = this;
    return this.hashPassword(password, salt).then(function(hash) {
      return hash === storedHash;
    });
  },

  verifyPasswordSync: function(password, storedHash, salt) {
    var hash = this.hashPasswordSync(password, salt);
    return hash === storedHash;
  },

  validatePasswordStrength: function(password) {
    var errors = [];
    if (!password || password.length < this.MIN_PASSWORD_LENGTH) {
      errors.push('密码至少需要' + this.MIN_PASSWORD_LENGTH + '位字符');
    }
    if (password && password.length > this.MAX_PASSWORD_LENGTH) {
      errors.push('密码不能超过' + this.MAX_PASSWORD_LENGTH + '位字符');
    }
    if (!this.PASSWORD_PATTERNS.hasLowerCase.test(password)) {
      errors.push('密码需要包含小写字母');
    }
    if (!this.PASSWORD_PATTERNS.hasDigit.test(password)) {
      errors.push('密码需要包含数字');
    }
    return {
      valid: errors.length === 0,
      errors: errors,
      score: errors.length === 0 ? 3 : (3 - errors.length)
    };
  },

  getPasswordStrengthLabel: function(password) {
    var result = this.validatePasswordStrength(password);
    var score = result.score;
    var hasUpper = this.PASSWORD_PATTERNS.hasUpperCase.test(password);
    var hasSpecial = this.PASSWORD_PATTERNS.hasSpecial.test(password);
    var lenBonus = password && password.length >= 10 ? 1 : (password && password.length >= 12 ? 2 : 0);
    if (hasUpper) score++;
    if (hasSpecial) score++;
    score += lenBonus;

    var labels = ['', '弱', '一般', '较强', '强', '非常强', '极强'];
    var colors = ['', '#f44336', '#ff9800', '#ffc107', '#4caf50', '#2e7d32', '#1565c0'];
    var capped = Math.min(score, 6);
    return {
      label: labels[capped],
      score: capped,
      color: colors[capped]
    };
  },

  isPasswordExpired: function(passwordUpdatedAt) {
    if (!passwordUpdatedAt) return true;
    var updated = typeof passwordUpdatedAt === 'string'
      ? new Date(passwordUpdatedAt).getTime()
      : passwordUpdatedAt;
    var expireTime = updated + this.PASSWORD_EXPIRE_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() > expireTime;
  },

  getPasswordAgeDays: function(passwordUpdatedAt) {
    if (!passwordUpdatedAt) return Infinity;
    var updated = typeof passwordUpdatedAt === 'string'
      ? new Date(passwordUpdatedAt).getTime()
      : passwordUpdatedAt;
    return Math.floor((Date.now() - updated) / (24 * 60 * 60 * 1000));
  },

  getPasswordExpireDays: function(passwordUpdatedAt) {
    var age = this.getPasswordAgeDays(passwordUpdatedAt);
    var remaining = this.PASSWORD_EXPIRE_DAYS - age;
    return Math.max(0, remaining);
  },

  hashWithWebCrypto: function(password, salt) {
    var self = this;
    return new Promise(function(resolve, reject) {
      if (!window.crypto || !window.crypto.subtle) {
        resolve(self.hashPasswordSync(password, salt));
        return;
      }

      var encoder = new TextEncoder();
      var data = encoder.encode(salt + password);

      window.crypto.subtle.digest('SHA-256', data).then(function(firstHash) {
        var currentBuffer = firstHash;

        function stretch(iter) {
          if (iter >= self.HASH_ITERATIONS) {
            resolve(self.arrayBufferToHex(currentBuffer));
            return;
          }
          var combined = encoder.encode(self.arrayBufferToHex(currentBuffer) + password);
          window.crypto.subtle.digest('SHA-256', combined).then(function(nextHash) {
            currentBuffer = nextHash;
            setTimeout(function() { stretch(iter + 1); }, 0);
          }).catch(function() {
            resolve(self.arrayBufferToHex(currentBuffer));
          });
        }

        stretch(1);
      }).catch(function() {
        resolve(self.hashPasswordSync(password, salt));
      });
    });
  }
};