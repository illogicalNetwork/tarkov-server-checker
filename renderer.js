const { remote, ipcRenderer } = require('electron')
const axios = require('axios')
const fs = require('fs')
const path = require('path')

let configPath
let globalApiKey = null

ipcRenderer.invoke('get-user-data-path').then(userDataPath => {
  configPath = path.join(userDataPath, 'config.json')

  if (!fs.existsSync(configPath)) {
    showApiKeyModal()
  } else {
    const config = JSON.parse(fs.readFileSync(configPath))
    globalApiKey = config.apiKey;
  }
})

document.addEventListener('DOMContentLoaded', () => {
  if (!fs.existsSync(configPath)) {
    showApiKeyModal()
  } else {
    const config = JSON.parse(fs.readFileSync(configPath))
    showMainContent()
  }
})

function showApiKeyModal () {
  document.getElementById('apiKeyModal').style.display = 'block'
  document.getElementById('mainContent').style.display = 'none'
}

function saveConfig (config) {
  fs.writeFileSync(configPath, JSON.stringify(config))
}

function closeApp () {
  const app = remote.app
  app.quit()
}

document.getElementById('saveApiKeyButton').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKeyInput').value.trim()
  if (apiKey) {
    saveConfig({ apiKey: apiKey })
    globalApiKey = apiKey
    document.getElementById('apiKeyModal').style.display = 'none'
    showMainContent()
  } else {
    const errorMessage = document.createElement('p')
    errorMessage.textContent = 'Please enter a valid API key.'
    errorMessage.style.color = 'red'
    document.getElementById('apiKeyModal').appendChild(errorMessage)
    document.getElementById('apiKeyInput').value = ''
    setTimeout(() => {
      errorMessage.remove()
    }, 5000)

    closeApp()
  }
})

function showMainContent () {
  document.getElementById('mainContent').style.display = 'block'
}

let selectedFilePath = ''

document.getElementById('selectFileButton').addEventListener('click', () => {
  ipcRenderer
    .invoke('open-file-dialog')
    .then(response => {
      if (!response.canceled && response.filePaths.length > 0) {
        selectedFilePath = response.filePaths[0]
        document.getElementById(
          'selectedFilePath'
        ).innerText = `Selected File: ${selectedFilePath}`
        document.getElementById('selectedFilePath').classList.add('alert-info')
        document
          .getElementById('selectedFilePath')
          .classList.remove('alert-danger')
      }
    })
    .catch(err => {
      console.error('Dialog error:', err)
    })
})

document.getElementById('processButton').addEventListener('click', () => {
  const shortId = document.getElementById('shortIdInput').value.trim()

  if (selectedFilePath && shortId) {
    document.getElementById('processButton').innerText = 'Processing...'
    document.getElementById('processButton').disabled = true

    findIPByShortId(selectedFilePath, shortId, ip => {
      if (ip) {
        resolveIPtoLocation(ip)
      } else {
        document.getElementById('result').innerText =
          'No matching IP address found.'
        document.getElementById('result').classList.add('alert-danger')
        document.getElementById('processButton').innerText = 'Process File'
        document.getElementById('processButton').disabled = false
      }
    })
  } else {
    alert('Please select a file and enter a Short ID.')
  }
})

function findIPByShortId (filePath, shortId, callback) {
  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) {
      console.error('Error reading the file: ', err)
      return
    }

    const lines = data.split('\n')
    let jsonBuffer = ''
    let isJsonStarted = false
    let foundIP = null

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (
        line.includes('push-notifications|Got notification | UserConfirmed')
      ) {
        isJsonStarted = true
        jsonBuffer = ''
      } else if (isJsonStarted) {
        jsonBuffer += line
        if (line.trim().endsWith('}')) {
          try {
            const jsonData = JSON.parse(jsonBuffer)
            if (jsonData.shortId === shortId) {
              foundIP = jsonData.ip
              break
            }
            isJsonStarted = false
          } catch (jsonError) {
            console.error('Error parsing JSON: ', jsonError)
          }
        }
      }
    }

    callback(foundIP)
  })
}

function resolveIPtoLocation (ip) {
  axios
    .get(`https://api.ipgeolocation.io/ipgeo?apiKey=${globalApiKey}&ip=${ip}`)
    .then(response => {
      const locationData = response.data
      document.getElementById(
        'result'
      ).innerText = `Location: ${locationData.city}, ${locationData.country_code2}`
      document.getElementById('result').classList.add('alert-success')
      document.getElementById('result').classList.remove('alert-danger')
      document.getElementById('processButton').innerText = 'Process File'
      document.getElementById('processButton').disabled = false
    })
    .catch(error => {
      console.error('Error fetching IP information: ', error)
      document.getElementById('result').innerText =
        'Failed to fetch location data.'
      document.getElementById('result').classList.add('alert-danger')
      document.getElementById('processButton').innerText = 'Process File'
      document.getElementById('processButton').disabled = false
    })
}
