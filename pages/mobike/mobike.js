
function inArray(arr, key, val) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i][key] === val) {
      return i;
    }
  }
  return -1;
}

// ArrayBuffer转16进度字符串示例
function ab2hex(buffer) {
  var hexArr = Array.prototype.map.call(
    new Uint8Array(buffer),
    function (bit) {
      return ('00' + bit.toString(16)).slice(-2)
    }
  )
  return hexArr.join('');
}

Page({
  data: {
    bleName: 'mobike',
    companyId: 'b304', //mobike companyId
    devices: [],
    //connected: false,
    //chs: [],
    DeviceStart: false
  },

  openBluetoothAdapter() {
    wx.openBluetoothAdapter({//初始化蓝牙模块
      success:(res)=>{
        console.log('openBluetoothAdapter success', res)
        this.startBluetoothDevicesDiscovery()//开启扫描
      },
      fail:(res)=>{
        if (res.errCode === 10001) {//蓝牙未打开
          wx.onBluetoothAdapterStateChange(function (res) {
            console.log('onBluetoothAdapterStateChange', res)
            if (res.available) {
              this.startBluetoothDevicesDiscovery()
            }
          })
        }
      }
    })
  },
  getBluetoothAdapterState() {
    wx.getBluetoothAdapterState({
      success: (res) => {
        console.log('getBluetoothAdapterState', res)
        if (res.discovering) {
          this.onBluetoothDeviceFound()
        } else if (res.available) {
          this.startBluetoothDevicesDiscovery()
        }
      }
    })
  },
  startBluetoothDevicesDiscovery() {
    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: true,
      success: (res) => {
        console.log('startBluetoothDevicesDiscovery success', res)
        this.setData({ DeviceStart: false })
        console.log("DeviceStart=" + this.data.DeviceStart)
        this.onBluetoothDeviceFound()
      },
    })
  },
  stopBluetoothDevicesDiscovery() {
    wx.stopBluetoothDevicesDiscovery()
  },
  onBluetoothDeviceFound() {
    wx.onBluetoothDeviceFound((res) => {
      res.devices.forEach( device => {
        
        var ble_name = this.data.bleName
        var ManufacturerData = ab2hex(device.advertisData)
        var company_id = ManufacturerData.slice(0, 4)
        var bike_num = ManufacturerData.slice(20, 30)
        ///*
        if (!device.name && !device.localName) {
          //if (ble_name !== device.name || ble_name !== device.localName){
          //console.log('ble_name is null')
          return
        }
        if (company_id !== this.data.companyId) {
          //console.log("company id = " + company_id + " is not " + this.data.companyId)
          return
        }
        if (bike_num.length != 10) {
          //console.log('bike_num length is not 10')
          return
        }
        //*/
        const length = this.data.devices.length
        const idx = inArray(this.data.devices, 'bike_num', bike_num)
        console.log(idx)
        if (idx === -1) {
            this.data.devices[length] = {}
            this.data.devices[length].bike_num = bike_num
            this.data.devices[length].RSSI = device.RSSI 
        } else {
            this.data.devices[idx].bikeNum = bike_num
            this.data.devices[idx].RSSI = device.RSSI 
        }
        this.setData(this.data)

      })
    })
  },
  /*
  createBLEConnection(e) {
    const ds = e.currentTarget.dataset
    const deviceId = ds.deviceId
    const name = ds.name
    wx.createBLEConnection({
      deviceId,
      success: (res) => {
        this.setData({
          connected: true,
          name,
          deviceId,
        })
        this.getBLEDeviceServices(deviceId)
      }
    })
    this.stopBluetoothDevicesDiscovery()
  },
  closeBLEConnection() {
    wx.closeBLEConnection({
      deviceId: this.data.deviceId
    })
    this.setData({
      connected: false,
      chs: [],
      canWrite: false,
    })
  },
  getBLEDeviceServices(deviceId) {
    wx.getBLEDeviceServices({
      deviceId,
      success: (res) => {
        for (let i = 0; i < res.services.length; i++) {
          if (res.services[i].isPrimary) {
            this.getBLEDeviceCharacteristics(deviceId, res.services[i].uuid)
            return
          }
        }
      }
    })
  },
  getBLEDeviceCharacteristics(deviceId, serviceId) {
    wx.getBLEDeviceCharacteristics({
      deviceId,
      serviceId,
      success: (res) => {
        console.log('getBLEDeviceCharacteristics success', res.characteristics)
        for (let i = 0; i < res.characteristics.length; i++) {
          let item = res.characteristics[i]
          if (item.properties.read) {
            wx.readBLECharacteristicValue({
              deviceId,
              serviceId,
              characteristicId: item.uuid,
            })
          }
          if (item.properties.write) {
            this.setData({
              canWrite: true
            })
            this._deviceId = deviceId
            this._serviceId = serviceId
            this._characteristicId = item.uuid
            this.writeBLECharacteristicValue()
          }
          if (item.properties.notify || item.properties.indicate) {
            wx.notifyBLECharacteristicValueChange({
              deviceId,
              serviceId,
              characteristicId: item.uuid,
              state: true,
            })
          }
        }
      },
      fail(res) {
        console.error('getBLEDeviceCharacteristics', res)
      }
    })
    // 操作之前先监听，保证第一时间获取数据
    wx.onBLECharacteristicValueChange((characteristic) => {
      const idx = inArray(this.data.chs, 'uuid', characteristic.characteristicId)
      const data = {}
      if (idx === -1) {
        data[`chs[${this.data.chs.length}]`] = {
          uuid: characteristic.characteristicId,
          value: ab2hex(characteristic.value)
        }
      } else {
        data[`chs[${idx}]`] = {
          uuid: characteristic.characteristicId,
          value: ab2hex(characteristic.value)
        }
      }
      // data[`chs[${this.data.chs.length}]`] = {
      //   uuid: characteristic.characteristicId,
      //   value: ab2hex(characteristic.value)
      // }
      this.setData(data)
    })
  },
  writeBLECharacteristicValue() {
    // 向蓝牙设备发送一个0x00的16进制数据
    let buffer = new ArrayBuffer(1)
    let dataView = new DataView(buffer)
    dataView.setUint8(0, Math.random() * 255 | 0)
    wx.writeBLECharacteristicValue({
      deviceId: this._deviceId,
      serviceId: this._serviceId,
      characteristicId: this._characteristicId,
      value: buffer,
    })
  },
  */
  closeBluetoothAdapter() {
    wx.closeBluetoothAdapter()
    this.setData({ devices: []       })
    this.setData({ DeviceStart: true })
    console.log("DeviceStart=" + this.data.DeviceStart)
  },
  onShow: function () {
    this.openBluetoothAdapter()
    console.log("onShow")
  },
  onReady: function () {
    this.openBluetoothAdapter()
    console.log("onReady")
  },
  onHide: function () {
    this.closeBluetoothAdapter()
    console.log("onHide")
  },
  onPullDownRefresh: function () {
    this.openBluetoothAdapter()
    console.log("onPullDownRefresh")
  },
  copyTBL: function (e) {
    wx.setClipboardData({
      data: e.currentTarget.dataset.bikenum,
      ///*
      success: function (_res) {
        wx.showToast({
          title: '复制成功',
        });
      }
      //*/
      /*
     success: function (res) {
       // self.setData({copyTip:true}),
      
       wx.showModal({
         title: '提示',
         content: '复制成功',
         success: function (res) {
           if (res.confirm) {
             console.log('确定')
           } else if (res.cancel) {
             console.log('取消')
           }
         }
       })
       
     }
     */
    });
  }
})
