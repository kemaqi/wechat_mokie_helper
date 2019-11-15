
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
    //判断小程序的API，回调，参数，组件等是否在当前版本可用。
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    isHide: false,

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
  },
  onLoad: function () {
    var that = this;
    // 查看是否授权
    wx.getSetting({
      success: function (res) {
        if (res.authSetting['scope.userInfo']) {
          that.setData({isHide: false});
          wx.getUserInfo({
            success: function (res) {
              // 用户已经授权过,不需要显示授权页面,所以不需要改变 isHide 的值
              // 根据自己的需求有其他操作再补充
              // 我这里实现的是在用户授权成功后，调用微信的 wx.login 接口，从而获取code
              wx.login({
                success: res => {
                  // 获取到用户的 code 之后：res.code
                  console.log("用户的code:" + res.code);
                  // 可以传给后台，再经过解析获取用户的 openid
                  // 或者可以直接使用微信的提供的接口直接获取 openid ，方法如下：
                  // wx.request({
                  //     // 自行补上自己的 APPID 和 SECRET
                  //     url: 'https://api.weixin.qq.com/sns/jscode2session?appid=自己的APPID&secret=自己的SECRET&js_code=' + res.code + '&grant_type=authorization_code',
                  //     success: res => {
                  //         // 获取到用户的 openid
                  //         console.log("用户的openid:" + res.data.openid);
                  //     }
                  // });
                }
              });
            }
          });
        } else {
          // 用户没有授权
          // 改变 isHide 的值，显示授权页面
          that.setData({
            isHide: true
          });
        }
      }
    });
  },
  bindGetUserInfo: function (e) {
    if (e.detail.userInfo) {
      //用户按了允许授权按钮
      var that = this;
      // 获取到用户的信息了，打印到控制台上看下
      console.log("用户的信息如下：");
      console.log(e.detail.userInfo);
      //授权成功后,通过改变 isHide 的值，让实现页面显示出来，把授权页面隐藏起来
      that.setData({
        isHide: false
      });
    } else {
      //用户按了拒绝按钮
      wx.navigateBack({ //退出小程序
        delta: -1
      })
      /*
      wx.showModal({
        title: '警告',
        content: '您点击了拒绝授权，将无法进入小程序，请授权之后再进入!!!',
        showCancel: false,
        confirmText: '返回授权',
        success: function (res) {
          // 用户没有授权成功，不需要改变 isHide 的值
          if (res.confirm) {
            console.log('用户点击了“返回授权”');
          }
        }
      })
      */
    }
  },
  onShareAppMessage: function () {
    // return custom share data when user share.
  }
})
