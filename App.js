/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  TouchableHighlight,
  Button,
  Dimensions,
  PixelRatio,
  PanResponder
} from 'react-native';


const {width, height} = Dimensions.get('window');

import {
  requireNativeComponent,
  findNodeHandle,
  NativeModules
} from 'react-native';


import {
  GCanvasView,
} from 'react-native-gcanvas';

import EV from './EV';

import { enable, ReactNativeBridge, Image as GImage } from "gcanvas.js";
import getMockData from './stockdata';
import * as ClChart from './clchart/cl.api'

ReactNativeBridge.GCanvasModule = NativeModules.GCanvasModule;
ReactNativeBridge.Platform = Platform;

ReactNativeBridge.GCanvasModule.setLogLevel(0);



const deviceScale = PixelRatio.get();
const containerLayout = { width:width, height: (height - 200) }
const canvasLayout = { width: containerLayout.width * deviceScale, height: containerLayout.height * deviceScale }

const eventCentral = new EV();

export default class App extends Component<{}> {

  canvas_holder = null;

  canvasCtx = null;

  canvasRef = null;

  Chart = null

  _panResponder = PanResponder.create({
    // Ask to be the responder:
    onStartShouldSetPanResponder: (evt, gestureState) => true,
    onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
    onMoveShouldSetPanResponder: (evt, gestureState) => true,
    onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,

    onPanResponderGrant: (evt, gestureState) => {
      evt.nativeEvent.offsetX = evt.nativeEvent.locationX
      evt.nativeEvent.offsetY = evt.nativeEvent.locationY
      eventCentral.emit('touchstart', evt.nativeEvent)
    },
    onPanResponderMove: (evt, gestureState) => {
      evt.nativeEvent.offsetX = evt.nativeEvent.locationX
      evt.nativeEvent.offsetY = evt.nativeEvent.locationY
      eventCentral.emit('touchmove', evt.nativeEvent)
    },
    onPanResponderTerminationRequest: (evt, gestureState) => true,
    onPanResponderRelease: (evt, gestureState) => {
      evt.nativeEvent.offsetX = evt.nativeEvent.locationX
      evt.nativeEvent.offsetY = evt.nativeEvent.locationY
      eventCentral.emit('touchend', evt.nativeEvent)
    },
    onPanResponderTerminate: (evt, gestureState) => {
    },
    onShouldBlockNativeResponder: (evt, gestureState) => {
      return true;
    },
  });
  

  onPressHandle = () => {
    var ref = this.canvas_holder;
    var canvas_tag = findNodeHandle(ref);
    var el = { ref:""+canvas_tag, style: canvasLayout};
    ref = enable(el, {bridge: ReactNativeBridge, disableAutoSwap: true});
    this.canvasRef = ref;
    var ctx = ref.getContext('2d');
    this.canvasCtx = ctx

    // create Chart
    const syscfg = {
      canvas: eventCentral,
			scale: deviceScale,
      context: ctx,
      runPlatform: 'react-native',
      eventPlatform: 'react-native',
      axisPlatform: 'phone',
      tools: {
        beforePaint: () => {
          this.canvasCtx.scale(1 / deviceScale, 1 / deviceScale);
        },
        afterPaint: () => {
          this.canvasRef._swapBuffers();
        }
      }
		}
    this.Chart = ClChart.createSingleChart(syscfg)
    Chart = this.Chart
  };
  
  handleMin = (code) => {
    console.log('Draw ====> Min Line')
    // 清除画布，及数据
    this.Chart.clear()
    // 初始化数据
    this.Chart.initData(20180413, ClChart.DEF_DATA.STOCK_TRADETIME)
    // 设置相应的数据
    this.Chart.setData('INFO', ClChart.DEF_DATA.FIELD_INFO, getMockData(code, 'INFO'))
    this.Chart.setData('MIN', ClChart.DEF_DATA.FIELD_MIN, getMockData(code, 'MIN'))
    this.Chart.setData('TICK', ClChart.DEF_DATA.FIELD_TICK, getMockData(code, 'TICK'))
    this.Chart.setData('NOW', ClChart.DEF_DATA.FIELD_NOW, getMockData(code, 'NOW'))
    // 设置画布尺寸
    let mainHeight = canvasLayout.height * 2 / 3
    let mainWidth = Math.max(canvasLayout.width * 0.65, canvasLayout.width - 400)
    if (code === 'SH000001') mainWidth = canvasLayout.width
    // 设置画布区域布局
    const mainLayoutCfg = {
      layout: ClChart.DEF_CHART.CHART_LAYOUT,
      config: ClChart.DEF_CHART.CHART_NOW,
      rectMain: {
        left: 0,
        top: 0,
        width: mainWidth,
        height: mainHeight
      }
    }
    const mainChart = this.Chart.createChart('MIN', 'CHART.LINE', mainLayoutCfg, function (result) {
      //  console.log(result)
    })
    this.Chart.bindData(mainChart, 'MIN')

    const volumeLoyoutCfg = {
      layout: ClChart.DEF_CHART.CHART_LAYOUT,
      config: ClChart.DEF_CHART.CHART_NOWVOL,
      rectMain: {
        left: 0,
        top: mainHeight,
        width: mainWidth,
        height: canvasLayout.height - mainHeight
      }
    }
    const volumeChart = this.Chart.createChart('MINNOW', 'CHART.LINE', volumeLoyoutCfg, function (result) {
      //  console.log(result)
    })
    this.Chart.bindData(volumeChart, 'MIN')

    if (code !== 'SH000001') {
      const orderLayoutCfg = {
        layout: ClChart.DEF_CHART.CHART_LAYOUT,
        config: ClChart.DEF_CHART.CHART_ORDER,
        rectMain: {
          left: mainWidth,
          top: 0,
          width: canvasLayout.width - mainWidth,
          height: canvasLayout.height
        }
      }
      const orderChart = this.Chart.createChart('ORDER', 'CHART.ORDER', orderLayoutCfg, function (result) {
        //  console.log(result)
      })
      // ??? 为什么可以不绑定数据
      // this.Chart.bindData(orderChart, 'TICK')
    }

    this.Chart.onPaint()
  }

  // 画日线
  handleKline = (code, peroid) => {
    let source = peroid
    if (peroid === 'WEEK' || peroid === 'MON') source = 'DAY'
    this.Chart.clear()
    this.Chart.initData(20180413, ClChart.DEF_DATA.STOCK_TRADETIME)
    this.Chart.setData('INFO', ClChart.DEF_DATA.FIELD_INFO, getMockData(code, 'INFO'))
    this.Chart.setData('RIGHT', ClChart.DEF_DATA.FIELD_RIGHT, getMockData(code, 'RIGHT'))
    this.Chart.setData(source, ClChart.DEF_DATA.FIELD_DAY, getMockData(code, source))
    const mainHeight = canvasLayout.height * 2 / 3
    const mainLayoutCfg = {
      layout: {
        offset: {
          left: 5,
          right: 10
        }
      },
      buttons: ClChart.DEF_CHART.CHART_BUTTONS,
      config: ClChart.DEF_CHART.CHART_KBAR,
      rectMain: {
        left: 0,
        top: 0,
        width: canvasLayout.width,
        height: mainHeight
      }
    }
    const KBarChart = this.Chart.createChart('KBAR', 'CHART.LINE', mainLayoutCfg, function (result) {
      //  console.log(result)
    })
    this.Chart.bindData(KBarChart, peroid)

    const volumeLoyoutCfg = {
      layout: {
        offset: {
          left: 5,
          right: 10
        }
      },
      config: ClChart.DEF_CHART.CHART_VBAR,
      rectMain: {
        left: 0,
        top: mainHeight,
        width: canvasLayout.width,
        height: canvasLayout.height - mainHeight
      }
    }
    const KVBarChart = this.Chart.createChart('VBAR', 'CHART.LINE', volumeLoyoutCfg, function (result) {
      //  console.log(result)
    })
    this.Chart.bindData(KVBarChart, peroid)

    this.Chart.onPaint()
  }

  handleSeer = () => {
    this.Chart.clear()
    this.Chart.initData(20180413, ClChart.DEF_DATA.STOCK_TRADETIME)
    this.Chart.setData('INFO', ClChart.DEF_DATA.FIELD_INFO, getMockData('SZ300545', 'INFO'))
    this.Chart.setData('RIGHT', ClChart.DEF_DATA.FIELD_RIGHT, getMockData('SZ300545', 'RIGHT'))
    this.Chart.setData('DAY', ClChart.DEF_DATA.FIELD_DAY, getMockData('SZ300545', 'DAY'))
    this.Chart.setData('SEER', ClChart.PLUGINS.FIELD_SEER, getMockData('SZ300545', 'SEER'))
    this.Chart.setData('SEERHOT', {}, ['15'])
    const mainHeight = canvasLayout.height * 2 / 3
    const mainLayoutCfg = {
      layout: {
        offset: {
          left: 5,
          right: 100,
          top: 20,
          bottom: 20
        }
      },
      buttons: [ { key: 'zoomin' }, { key: 'zoomout' } ],
      config: ClChart.PLUGINS.CHART_SEER,
      rectMain: {
        left: 0,
        top: 0,
        width: canvasLayout.width,
        height: mainHeight
      }
    }
    const KBarChart = this.Chart.createChart('SEER', 'CHART.LINE', mainLayoutCfg, function (result) {
      //  console.log(result)
    })
    this.Chart.bindData(KBarChart, 'DAY')

    const volumeLayoutCfg = {
      layout: {
        offset: {
          left: 5,
          right: 100,
          top: 20,
          bottom: 20
        }
      },
      config: ClChart.DEF_CHART.CHART_VBAR,
      rectMain: {
        left: 0,
        top: mainHeight,
        width: canvasLayout.width,
        height: canvasLayout.height - mainHeight
      }
    }
    const KVBarChart = this.Chart.createChart('VBAR', 'CHART.LINE', volumeLayoutCfg, function (result) {
      //  console.log(result)
    })
    this.Chart.bindData(KVBarChart, 'DAY')

    this.Chart.onPaint()
  }

  render() {
    return (
      <View>
        <View
          style={{flexDirection: 'row', marginTop: 20, flexWrap: 'wrap'}}
        >
          <Button 
            style={styles.button}
            onPress={() => {
              this.handleMin('SH000001')
            }}
            title={'SH000001 MIN'}
          />
          <Button 
            style={styles.button}
            onPress={() => {
              this.handleMin('SZ300545')
            }}
            title={'SZ300545 MIN'}
          />
          <Button 
            style={styles.button}
            onPress={() => {
              this.handleKline('SZ300545', 'DAY')
            }}
            title={'SZ300545 DAY'}
          />
          <Button 
            style={styles.button}
            onPress={() => {
              this.handleKline('SZ300545', 'WEEK')
            }}
            title={'SZ300545 WEEK'}
          />
          <Button 
            style={styles.button}
            onPress={() => {
              this.handleSeer()
            }}
            title={'SZ300545 SEER'}
          />
        </View>
        <View
          style={containerLayout}
          {...this._panResponder.panHandlers}
        >
          <GCanvasView
            onLayout={() => {
              this.onPressHandle()
            }}
            ref={(c) => {
              this.canvas_holder = c
            }}
            style={[styles.gcanvas, containerLayout]}
          >
          </GCanvasView>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  gcanvas: {
    top: 20,
    backgroundColor: '#FF000030',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  button: {
    width: 80,
  },
  welcome: {
    fontSize: 50,
    textAlign: 'center',
    margin: 10,
    top:20,
    height :40
  }
});
