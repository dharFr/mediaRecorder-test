navigator.getUserMedia = navigator.getUserMedia ||
                         navigator.webkitGetUserMedia ||
                         navigator.mozGetUserMedia

const app = {

  loginElem      : null,
  logoutElem     : null,
  loginBtn       : null,
  logoutBtn      : null,
  nameElem       : null,
  videoElem      : null,
  recordBtn      : null,
  uploadBtn      : null,

  session        : null,
  screenname     : null,

  mediaRecorder  : null,
  recordedChunks : [],

  uploadURL     : null,
  progressURL   : null,

  handleSessionUpdate(resp) {
    console.log('session update', resp)
    if (resp.session)
    {
      this.session = resp.session
      this.updateScreenname()
        .then((screenname) => {
          if (screenname != this.nameElem.textContent) {
            this.nameElem.textContent = screenname
          }
        })

      // logged in and connected user, someone you know
      this.loginElem.classList.add('hidden')
      this.loginBtn.setAttribute('disabled', '')
      this.logoutElem.classList.remove('hidden')
      this.logoutBtn.removeAttribute('disabled')

      if (resp.session.scope)
      {
        // user is logged in and granted some permissions.
        // perms is a comma separated list of granted permissions
        this.updateUploadURL()
      }
      else
      {
        // user is logged in, but did not grant any permissions
      }
    }
    else
    {
      // user is not logged in
      this.session    = null
      this.screenname = null
      this.logoutElem.classList.add('hidden')
      this.logoutBtn.setAttribute('disabled', '')
      this.loginElem.classList.remove('hidden')
      this.loginBtn.removeAttribute('disabled')
    }
  },

  updateScreenname() {
    return new Promise((resolve, reject) => {
      if (this.screenname != null) {
       resolve(this.screenname)
       return
      }

      console.log('fetching screenname...')
      DM.api('/me', { fields: 'screenname' }, (resp) => {
        console.log('screenname', resp)
        this.screenname = resp.screenname
        if (this.screenname != null) {
         resolve(this.screenname)
        }
        else {
          reject()
        }
      })
    })
  },

  updateUploadURL() {
    return new Promise((resolve, reject) => {
      if (this.uploadURL != null && this.progressURL != null) {
        resolve(this.uploadURL, this.progressURL)
        return
      }

      DM.api('/file/upload', (resp) => {
        try {
          console.log('/file/upload', resp)
          this.uploadURL   = resp.upload_url
          this.progressURL = resp.progress_url
          resolve(this.uploadURL, this.progressURL)
        }
        catch (e) {
          reject(e)
        }
      })
    })
  },

  prepareDailymotionUser() {
    DM.init({
      apiKey: '217ec1f4e64a97631f78',
      status: true, // check login status
      cookie: true // enable cookies to allow the server to access the session
    });

    this.logoutBtn.addEventListener('click', (e) => {
      DM.logout(this.handleSessionUpdate.bind(this));
    })

    this.loginBtn.addEventListener('click', (e) => {
      DM.login(this.handleSessionUpdate.bind(this), { scope: 'read write' });
    })

    DM.getLoginStatus(this.handleSessionUpdate.bind(this));
  },

  startVideo() {
    console.log('getting userMedia')
    return navigator.mediaDevices.getUserMedia({
      audio : true,
      video : { width: 1280, height: 720 },
    })
    .then((mediaStream) => {
      console.log('got userMedia')
      /* use the stream */
      this.videoElem.srcObject = mediaStream
      this.videoElem.onloadedmetadata = (e) => {
        this.videoElem.play()
      }
      return mediaStream
    })
  },

  setupMediaRecorder(mediaStream) {
    const options = (function getMediaRecorderOptions() {
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        return {mimeType: 'video/webm; codecs=vp9'}
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
         return {mimeType: 'video/webm; codecs=vp8'}
      } else {
        return {}
      }
    })()

    this.mediaRecorder = new MediaRecorder(mediaStream, options)
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.recordedChunks.push(e.data)
      }
    }
    this.recordBtn.addEventListener('click', this.onToogleRecord.bind(this))
    this.uploadBtn.addEventListener('click', this.uploadRecord.bind(this))
    this.recordBtn.removeAttribute('disabled')
  },

  onToogleRecord() {
    switch(this.mediaRecorder.state) {
      case 'inactive':
        console.log('Recording starts...')
        this.recordedChunks = []
        this.mediaRecorder.start()

        this.recordBtn.style.background = 'red'
        this.recordBtn.style.color = 'black'
        this.recordBtn.textContent = 'Stop Recording'
        this.uploadBtn.setAttribute('disabled', '')
        break

      case 'recording':
        console.log('Recording stops..!')
        this.mediaRecorder.stop()
        this.recordBtn.style.background = ''
        this.recordBtn.style.color = ''
        this.recordBtn.textContent = 'Start Recording'
        this.uploadBtn.removeAttribute('disabled')
        break
      // case 'paused':
      //   break;
    }
  },

  uploadRecord() {
    if (this.recordedChunks.length <= 0) {
      return
    }

    this.updateUploadURL()
      .then(() => {
        const blob = new Blob(this.recordedChunks, {
          type: 'video/webm'
        })

        const formData  = new FormData()
        formData.append('file', blob, 'upload.webm');

        fetch(this.uploadURL, {
          method: 'POST',
          body: formData
        })
        .then((resp) => resp.json())
        .then((resp) => {
          console.log('done', resp)
          DM.api('/me/videos', 'post', {
            title     : 'test',
            url       : resp.url,
            published : true,
          }, (videoResp) => {
            console.log('new video', videoResp)
          })
        })
        .catch((err) => { console.error('err', err) })
      })
  },

  run() {
    this.loginElem  = document.querySelector('#app .user .login')
    this.logoutElem = document.querySelector('#app .user .logout')

    this.loginBtn   = this.loginElem.querySelector('.loginBtn')
    this.logoutBtn  = this.logoutElem.querySelector('.logoutBtn')

    this.nameElem   = this.logoutElem.querySelector('.screenname')

    this.recordBtn  = document.querySelector('#app .video .recordBtn')
    this.videoElem  = document.querySelector('#app .video video')
    this.uploadBtn  = document.querySelector('#app .video .uploadBtn')

    window.dmAsyncInit = this.prepareDailymotionUser.bind(this)
    this.startVideo()
      .then(this.setupMediaRecorder.bind(this))
      .catch((err) => {
        console.error(err)
      })
  }
}

app.run()




