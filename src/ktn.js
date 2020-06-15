// sid: string 房间号 idx: number 自身的id
// 服务器地址 例如'localhost:8000'
var base_server = window.location.href.substring(window.location.protocol.length+2).split('/')[0];
// dom对象
var mc = document.getElementById('mc'),     // 主容器
    mv = document.getElementById('mv'),   // 主视频显示
    rb = document.getElementById('rb'),     // 侧边栏
    trb = document.getElementById('trb'),   // 侧边栏开关按钮
    rc = document.getElementById('rc'),     // 侧边容器，成员列表
    bb = document.getElementById('bb'),     // 底边栏
    tbb = document.getElementById('tbb'),   // 底边栏开关按钮
    ab = document.getElementById('ab'),     // 话筒按钮
    vb = document.getElementById('vb'),     // 视频按钮
    ds = document.getElementById('ds'),     // 投屏按钮
    dm = document.getElementById('dm'),     // 弹幕按钮
    qu = document.getElementById('qu'),     // 退出按钮
    dmc = document.getElementById('dmc'),   // 弹幕发送容器
    dmi = document.getElementById('dmi'),   // 弹幕输入框
    dmb = document.getElementById('dmb'),   // 弹幕发送按钮
    ddc = document.getElementById('ddc'),   // 弹幕显示容器
    ddt = document.getElementById('ddt'),   // 弹幕显示标题
    ddd = document.getElementById('ddd');   // 弹幕显示盒子

(window.onresize = () => {
// 将mv移到视野中央
    var fx = mc.offsetWidth - 40;
    if(rb.offsetWidth) {
        fx -= 120;
    }
    var fy = mc.offsetHeight - 40;
    if(bb.offsetHeight) {
        fy -= 60;
    }
    if(fy * 16 < fx * 9) {
        var vw = fy * 16 / 9;
        bb.style['width'] = vw - 80 + 'px';
        mv.style['width'] = vw + 'px';
        mv.style['height'] = fy + 'px';
        mv.style['top'] = '20px';
        bb.style['left'] = 60 + (fx - vw) / 2 + 'px';
        mv.style['left'] = 20 + (fx - vw) / 2 + 'px';
        tbb.style['left'] = (fx - 20) / 2 + 'px';
    }
    else{
        var vh = fx * 9 / 16;
        bb.style['width'] = fx - 80 + 'px';
        mv.style['width'] = fx + 'px';
        mv.style['height'] = vh + 'px';
        mv.style['top'] = 20 + (fy - vh) / 2 + 'px';
        bb.style['left'] = '60px'
        mv.style['left'] = '20px';
        tbb.style['left'] = (fx - 20) / 2 + 'px';
    }
    // 弹幕
    dmc.style['width'] = fx - 120 + 'px';
    dmc.style['left'] = '80px';
    dmi.style['width'] = fx - 194 + 'px';
})();


function EventEmitter() {
    this.events = {};
}

//绑定事件函数
EventEmitter.prototype.on = function(eventName, callback) {
    this.events[eventName] = this.events[eventName] || [];
    this.events[eventName].push(callback);
};

//触发事件函数
EventEmitter.prototype.emit = function(eventName, _) {
    var events = this.events[eventName],
        args = Array.prototype.slice.call(arguments, 1),
        i;
    if (!events) {
        return;
    }
    for (i in events) {
        events[i].apply(null, args);
    }
};

// 事件处理器（全局）
var EE = new EventEmitter();

// ws通信（全局）
var WS = new WebSocket(`ws://${base_server}/ws`);

// 课堂对象（全局）
var Kt = {
    cnc: 0,     // 成员数（不包括主持人）
    ds: null,   // 投屏对象号
    dsable: true,   // 是否允许投屏
    dmable: true,   // 是否允许弹幕
    ktm: null,  // {name, aopen, vopen, avable}
    ktu: [],    // list of {name, aopen, vopen, avable}
};

// 课堂成员列表dom对象
var Kt_dom = {
    m: null, 
    u: []
};

// 投屏和音视频的`PeerConnect`
var PCs = {};

// 储存本地流 用户流 轨道s
var RTCStreams = {
    localStream: new window.MediaStream(),
    localTracks: [null, null, null]     // audio video screen
};

// 储存本地媒体播放的dom
MDom = {
    videos: {},     // u, b, n, a
    act: null,
    normal: () => {
        var vs = MDom.videos, video;
        if(MDom.act) {
            MDom.act.className = 'mv-n';
            MDom.act = null;
        }
        for(var i in vs) {
            video = vs[i];
            video.className === 'mv-b' && (video.className = 'mv-n');
        }
    },
    active: i => {
        var vs = MDom.videos, video = vs[i];
        if(!video || MDom.act === video) return;
        if(MDom.act) MDom.act.className = 'mv-b';
        MDom.act = video;
        video.className = 'mv-a';
        for(var _ in vs) {
            _ != i && vs[_].className === 'mv-n' && (vs[_].className = 'mv-b');
        }
    },
    count: () => {
        var vs = MDom.videos, c = 0;
        for(var i in vs) {
            vs[i].className !== 'mv-u' && c++;
        }
        return c;
    },
    unuse: i => {
        var vs = MDom.videos, video = vs[i];
        if(!video) return;
        video.className = 'mv-u';
        if(MDom.act === video) {
            MDom.act = null;
            MDom.normal();
        }
    }, 
    att: (i, srcObject, audio) => {
        if(i === undefined) return null;
        var vs = MDom.videos, video;
        if(vs[i]) {
            video = vs[i];
        }else {
            video = document.createElement('video');
            vs[i] = video;
            video.className = 'mv-u';
            video.autoplay = true;
            mv.appendChild(video);
            video.ondblclick = () => {
                if(MDom.act) {
                    MDom.normal();
                }else {
                    MDom.active(i);
                }
            }
        }
        if(srcObject === undefined) return video;
        if(srcObject === null) {
            video.srcObject = null;
            MDom.unuse(i);
            return video;
        }
        typeof srcObject === 'object' && srcObject instanceof MediaStream && (video.srcObject = srcObject);
        typeof srcObject === 'string' && srcObject.length && (video.src = srcObject);
        if(audio) {
            MDom.unuse(i);
            return video;
        }
        if(MDom.act !== null) {
            MDom.act !== video && (video.className = 'mv-b');
            return video;
        }
        // u, b, n
        video.className = 'mv-n';
        if(MDom.count() === 1) {
            video.className = 'mv-a';
            MDom.act = video;
        }
        return video;
    }, 
    remove: i => {
        var vs = MDom.videos, video;
        video = vs[i];
        if(!video) return;
        if(video === MDom.act) MDom.normal();
        mv.removeChild(video);
        delete vs[i];
        if(MDom.count() === 1) {
            for(var _ in vs) {
                if (vs[_].className !== 'mv-u') {
                    MDom.active(_);
                    break;
                }
            }
        }
    }
};

var iceServer = {
    iceServers: [{
        url: 'stun:stun.l.google.com:19302'
    }]
};

// 防止i下标溢出
var expu = i => {
    while(Kt.ktu.length <= i) 
        Kt.ktu.push(null);
    while(Kt_dom.u.length <= i) 
        Kt_dom.u.push(null);
}

var addU_Dom = (u, i) => {
    // u : {name, vopen, mopen, mable} | undefined
    // i : 成员号
    if (!u) return;
    var ud = document.createElement('div');
    ud._np = document.createElement('p');   // name
    ud._op = document.createElement('p');   // 图标们
    ud._ai = document.createElement('img'); // 声音
    ud._vi = document.createElement('img'); // 视频
    if(i == -1) {
        Kt_dom.m = ud;
    }else{
        expu(i);
        Kt_dom.u[i] = ud;
        if(idx == i) {
            ud._np.ondblclick = () => {
                var temp_inp = document.createElement('input');
                ud.appendChild(temp_inp);
                temp_inp.style['position'] = 'relative';
                temp_inp.style['height'] = '26px';
                temp_inp.style['width'] = '92px';
                temp_inp.style['left'] = '10px';
                temp_inp.style['top'] = '-56px';
                temp_inp.focus();
                temp_inp.onblur = () => {
                    if(temp_inp.value.length && temp_inp.value !== ud._np.innerText) 
                        WS.send(JSON.stringify({des: 'rrn', name: temp_inp.value}));
                    ud.removeChild(temp_inp);
                }
                temp_inp.onkeypress = e => {
                    if (e.which === 13)
                        temp_inp.blur();
                }
            };
            ud._np.style['color'] = u.avable ? 'blue' : 'red';
        }else{
            ud._np.style['color'] = u.avable ? 'black' : 'gray';
        }
    }
    rc.appendChild(ud);
    ud.appendChild(ud._np);
    ud.appendChild(ud._op);
    ud._op.appendChild(ud._ai);
    ud._op.appendChild(ud._vi);
    ud._ai.src = u.aopen ? 'img/microphone_on.png' : 'img/microphone_off.png';
    ud._vi.src = u.vopen ? 'img/webcam_on.png' : 'img/webcam_off.png';
    ud._np.innerText = u.name;
};

// 获取dom
var getU_Dom = i => {
    if(i == -1) return Kt_dom.m;
    if(i < 0 || i >= Kt_dom.u.length) return null;
    return Kt_dom.u[i];
};

// 获取ktu信息
var getU_Kt = i => {
    if(i == -1) return Kt.ktm;
    if(i < 0 || i >= Kt.ktu.length) return null;
    return Kt.ktu[i];
}

// 将成员移除 Kt、Kt_dom
var removeUK = i => {
    // i : number
    if(i < Kt.ktu.length) {
        Kt.ktu[i] = null; // TO-DO
        Kt.cnc--;
    }
    if(i < Kt_dom.u.length && Kt_dom.u[i]) {
        rc.removeChild(Kt_dom.u[i]);
        Kt_dom.u[i] = null;
    }
};

var loadList = () => {
    rc.innerHTML = '';
    Kt_dom.u = [];
    Kt.ktm && addU_Dom(Kt.ktm, -1);
    Kt.ktu.forEach((u, i) => {
        addU_Dom(u, i);
    });
};


// ===================== 媒体区 =====================

// 关闭与i的PeerConnection
var closePC = i => {
    var pc = PCs[i];
    if(pc) {    // pc、null、undefined
        pc.close();
        PCs[i] = null;
    }
};

// 获取(或初始化)与i的PeerConnection
var getPC = i => {
    if(PCs[i]) return PCs[i];
    var pc = new window.webkitRTCPeerConnection(iceServer);
    PCs[i] = pc;
    pc.index = 0;
    pc._initA = null;
    pc.tracks = [null, null, null];     // audio video screen
    pc.onicecandidate = event => {
        if (event.candidate){
            WS.send(JSON.stringify({des: 'rice', ice: event.candidate, idx: i}));
        }
    };
    pc.ontrack = e => {
        var which;
        if (pc._initA === null){
            which = pc.index;
            pc.tracks[which] = e.track;
        }else {
            which = pc._initA[pc.index];
            pc.tracks[which] = e.track;
            pc.index++;
            console.log('初始流', which, pc._initA, pc.tracks);
            if(pc.index === pc._initA.length) {  // 初始流加载完成
                pc.index = 0;
                pc._initA = null;
            }
        }
        if(which === 0) {
            // i开启语音
            MDom.att(i, getRemoteStream(i), pc.tracks[1] === null);
        }else if(which === 1) {
            // i开启视频
            MDom.att(i, getRemoteStream(i));
        }else {
            // i开启投屏
            if(Kt.ds == i) {
                MDom.att('screen', getScreenStream());
            }else {
                console.log('来自 ' + getU_Kt(i).name + ' 的屏幕分享流, 但此时 ' + getU_Kt(Kt.ds).name + ' 正在进行屏幕分享');
            }
        }
    };
    pc.addStream(RTCStreams.localStream);
    return pc;
};

// 向i发送offer
var sendOffer = i => {
    if(i == idx) return;
    var pc = getPC(i);
    pc.createOffer(sdp => {
        pc.setLocalDescription(sdp);
        WS.send(JSON.stringify({des: 'rsdp', sdp: sdp, idx: i, back: true}));
    }, error => {
        console.log(error);
    });
};

// 向所有成员发送offer
var sendOffers = () => {
    Kt.ktm && sendOffer(-1);
    Kt.ktu.forEach((u, i) => {
        u && i != idx && sendOffer(i);
    });
};

// 接收到来自i的offer, 向i发送answer
var sendAnswer = (i, sdp) => {
    var pc = getPC(i);
    pc.setRemoteDescription(new window.RTCSessionDescription(sdp));
    pc.createAnswer(sdp => {
        pc.setLocalDescription(sdp);
        WS.send(JSON.stringify({des: 'rsdp', sdp: sdp, idx: i, back: false}));
    }, error => {
        console.log(error);
    });
};

// 获取当前投屏的流
var getScreenStream = () => {
    var track, tracks = [];
    Kt.ds !== null && (track = Kt.ds == idx ? RTCStreams.localTracks[2] : getPC(Kt.ds).tracks[2]) && tracks.push(track);
    return new window.MediaStream(tracks);
};

// 获取当前视频的流
var getVideoStream = () => {
    var track, tracks = [];
    (track = RTCStreams.localTracks[1]) && tracks.push(track);
    return new window.MediaStream(tracks);
};

// 根据用户的状态 获取用户的视频流(声音流)
var getRemoteStream = i => {
    var track, tracks = [];
    getU_Kt(i).aopen && (track = getPC(i).tracks[0]) && tracks.push(track);
    getU_Kt(i).vopen && (track = getPC(i).tracks[1]) && tracks.push(track);
    return new window.MediaStream(tracks);
};

var Media = {
    audio_off: () => {
        var track = RTCStreams.localTracks[0];
        if(track === null) return;
        track.stop();
        RTCStreams.localStream.removeTrack(track);
        RTCStreams.localTracks[0] = null;
    },
    audio_on: callback => {
        navigator.mediaDevices.getUserMedia({audio: true}).then(s => {
            var track = s.getTracks()[0];
            s.removeTrack(track);
            RTCStreams.localTracks[0] = track;
            RTCStreams.localStream.addTrack(track);
            callback && callback();
        }, e => {
            console.log('开启话筒失败', e);
        });
    },
    video_off: () => {
        var track = RTCStreams.localTracks[1];
        if(track === null) return;
        track.stop();
        RTCStreams.localStream.removeTrack(track);
        RTCStreams.localTracks[1] = null;
    },
    video_on: callback => {
        navigator.mediaDevices.getUserMedia({video: true}).then(s => {
            var track = s.getTracks()[0];
            s.removeTrack(track);
            RTCStreams.localTracks[1] = track;
            RTCStreams.localStream.addTrack(track);
            callback && callback();     // 本地处理完后回调
        }, e => {
            console.log('开启视频失败', e);
        });
    },
    screen_off: () => {
        var track = RTCStreams.localTracks[2];
        if(track === null) return;
        track.stop();
        RTCStreams.localStream.removeTrack(track);
        RTCStreams.localTracks[2] = null;
    },
    screen_on: callback => {
        navigator.mediaDevices.getDisplayMedia({video: true}).then(s => {
            var track = s.getTracks()[0];
            s.removeTrack(track);
            RTCStreams.localTracks[2] = track;
            RTCStreams.localStream.addTrack(track);
            callback && callback();
        }, e => {
            console.log('获取屏幕失败', e);
        });
    }
};

var trackInit = i => {
    var initA = [];
    RTCStreams.localStream.getTracks().forEach(t => {
        for(var _ = 0; _ < 3; _++) {
            if (t === RTCStreams.localTracks[_]) {
                initA.push(_);
            }
        }
    });
    if(initA.length) {
        WS.send(JSON.stringify({des: 'init', initA: initA, idx: i}));
        sendOffer(i);
    }
};


// ===================== 操作区 =====================

var ws_opened = () => {
    trb.onclick = () => {
        if(rb.offsetWidth) {
            rb.style['display'] = 'none';
            trb.style['right'] = 0;
        }else{
            rb.style['display'] = 'block';
            trb.style['right'] = '120px';
        }
        window.onresize();
    };

    tbb.onclick = () => {
        if(bb.offsetHeight) {
            bb.style['display'] = 'none';
            tbb.style['bottom'] = 0;
        }else{
            bb.style['display'] = 'block';
            tbb.style['bottom'] = '60px';
        }
        window.onresize();
    };

    dm.onclick = () => {
        if (dmc.offsetHeight) {
            dmc.style['display'] = 'none';
        }else{
            if (Kt.dmable) {
                dmc.style['display'] = 'block';
            }
        }
    };

    // 发送弹幕
    dmb.onclick = () => {
        if(Kt.dmable && dmi.value.length > 0) {
            WS.send(JSON.stringify({des: 'rdm', msg: dmi.value}));
        }
    }; 

    dmi.onkeypress = e => {
        if(e.which === 13) {
            dmb.click();
        }
    };

    ddt.onclick = () => {
        if (ddd.offsetHeight) {
            // 关
            ddc.className = 'ddc-close';
        }else{
            // 开
            if(ddc.count) {
                ddc.count = 0;
                ddt.innerText = '';
            }
            ddc.className = 'ddc-open';
        }
    };

    ab.onclick = () => {
        if(!getU_Kt(idx).avable) return;
        if(getU_Kt(idx).aopen){
            // 关闭
            WS.send(JSON.stringify({des: 'rad'}));
            Media.audio_off();
        }else{
            // 开启
            Media.audio_on(() => {
                WS.send(JSON.stringify({des: 'rao'}));
            });
        }
    };

    vb.onclick = () => {
        if(!getU_Kt(idx).avable) return;
        if(getU_Kt(idx).vopen){
            // 关闭
            WS.send(JSON.stringify({des: 'rvd'}));
            Media.video_off();
        }else{
            // 开启
            Media.video_on(() => {
                WS.send(JSON.stringify({des: 'rvo'}));
            });
        }
    };

    ds.onclick = () => {
        if(!Kt.dsable) return;
        if(Kt.ds === null) {
            // 开启
            Media.screen_on(() => {
                // 获取成功
                WS.send(JSON.stringify({des: 'rds', ds: idx}));
            });
        }else if(Kt.ds == idx){
            // 关闭
            WS.send(JSON.stringify({des: 'rds', ds: null}));
            Media.screen_off();
        }else{
            // Kt.ds正在投屏
        }
    };
};


// ===================== 处理区 =====================

// 给EE绑定处理
var ee_init = () => {
    EE.on('uin', data => {
        if(data.ok) {
            WS.send(JSON.stringify({des: 'rkt'}));
            qu.onclick = () => {
                WS.send(JSON.stringify({des: 'uout'}));
            }
        }else{
            alert('进入失败，请重新加入');
            window.location.href = '/';
        }
    });
    EE.on('uout', data => {
        if(data.ok) {
            window.location.href = '/';
        }else{
            alert('退出失败');
        }
    });
    EE.on('Rin', data => {
        var u = {name: data.name, aopen: false, vopen: false, avable: true};
        trackInit(data.idx);
        addU_Dom(u, data.idx);
        Kt.ktu[data.idx] = u;
        Kt.cnc++;
    });
    EE.on('Rout', data => {
        if(Kt.ds == data.idx) {
            Kt.ds = null;
            MDom.att('screen', null);
        }
        MDom.remove(data.idx);
        removeUK(data.idx);
        closePC(data.idx);
    });
    EE.on('Rover', data => {
        alert('下课了');
        window.location.href = '/';
    });
    EE.on('rkt', data => {
        if(data.ok){
            Kt = data.data;
            loadList();
            document.title = sid + ' - ' + getU_Kt(idx).name;
            // TO-DO
            if(Kt.ds) {
                ds.firstElementChild.src = Kt.ds == idx ? 'img/monitor_up.png' : 'img/monitor_down.png';
            }
            if(!Kt.dmable) {
                dm.firstElementChild.src = 'img/dm_off.png';
            }
            if(!Kt.dsable) {
                ds.firstElementChild.src = 'img/monitor_off.png';
            }
        }else{
            alert('加载列表失败');
        }
    });
    EE.on('rrn', data => {
        if(!data.ok) 
            console.log('更改昵称失败');
    });
    EE.on('Rrn', data => {
        getU_Dom(data.idx)._np.innerText = data.name;
        getU_Kt(data.idx).name = data.name;
        if(data.idx == idx) 
            document.title = sid + ' - ' + data.name;
    });
    EE.on('rdm', data => {
        if(data.ok) {
            dmi.value = '';
            dmi.focus();
        }
        else{
            console.log('弹幕发送失败');    // 可能是被禁言
        }
    });
    EE.on('Rdm', data => {
        var p = document.createElement('p');
        p.innerText = data.msg;
        if (data.idx == idx)
            p.className = 'mine';
        ddd.appendChild(p);
        if (!ddd.offsetHeight) {
            typeof ddc.count === 'undefined' && (ddc.count = 0);
            ddc.count++;
            ddt.innerText = ddc.count;
        }
    });
    EE.on('Rdmo', data => {
        // 启用弹幕(整个课堂启用, 自己依然可能被禁言)
        Kt.dmable = true;
        dm.firstElementChild.src = 'img/dm_on.png';
    });
    EE.on('Rdmd', data => {
        // 禁用弹幕
        Kt.dmable = false;
        dm.firstElementChild.src = 'img/dm_off.png';
    });
    EE.on('rds', data => {
        // 请求投屏(开或关)
        if(data.ok){
            // 请求成功
            if(data.ds === null) {
                // 关请求
            }else{
                // 开请求
                ds.firstElementChild.src = 'img/monitor_up.png';
                MDom.att('screen', getScreenStream());
                sendOffers();
            }
        }else{
            // 请求失败
            if(data.ds === null) {
                // 关请求
            }else{
                // 开请求
                Media.screen_off();
            }
        }
    });
    EE.on('Rds', data => {
        if (data.ds === null) {
            // 关闭投屏
            if(Kt.ds == idx) {
                // 自己关闭 当正在投屏时被禁止时也会触发
                Media.screen_off();
                ds.firstElementChild.src = 'img/monitor.png';
            }else{
                // 别人关闭
                if(getPC(Kt.ds).tracks[2]) {
                    getPC(Kt.ds).tracks[2].stop();
                    getPC(Kt.ds).tracks[2] = null;
                }
                // TO-DO
                ds.firstElementChild.src = 'img/monitor.png';
            }
            MDom.att('screen', null);
            Kt.ds = null;
        }else {
            // 开启投屏
            Kt.ds = data.ds;
            if(data.ds == idx) {
                // 自己开启
            }else {
                // 别人开启
                getPC(Kt.ds).index = 2;
                ds.firstElementChild.src = 'img/monitor_down.png';
            }
        }
    });
    EE.on('Rdso', data => {
        Kt.dsable = true;
        ds.firstElementChild.src = 'img/monitor.png';
    });
    EE.on('Rdsd', data => {
        if(Kt.ds !== null) {
            // 有人正在投屏
            if(Kt.ds == idx) {
                // 自己正在投屏
                Media.screen_off();
            }else{
                if(getPC(Kt.ds).tracks[2]){
                    getPC(Kt.ds).tracks[2].stop();
                    getPC(Kt.ds).tracks[2] = null;
                }
            }
            MDom.att('screen', null);
            Kt.ds = null;
        }
        Kt.dsable = false;
        ds.firstElementChild.src = 'img/monitor_off.png';
    });
    EE.on('Ravo', data => {
        getU_Dom(data.idx)._np.style.color = data.idx == idx ? 'blue' : 'black';
        getU_Kt(data.idx).avable = true;
    });
    EE.on('Ravd', data => {
        getU_Dom(data.idx)._np.style.color = data.idx == idx ? 'red' : 'gray';
        getU_Kt(data.idx).avable = false;
    });
    EE.on('rao', data => {
        // 请求开启声音
        if(data.ok) {
            // 请求成功
            ab.firstElementChild.src = 'img/microphone_on.png';
            sendOffers();
        }else{
            // 请求失败
            Media.audio_off();
            console.log('开启声音失败');
        }
    });
    EE.on('rad', data => {
        // 请求关闭声音
        if(data.ok) {
        }
    });
    EE.on('Rao', data => {
        getU_Dom(data.idx)._ai.src = 'img/microphone_on.png';
        getU_Kt(data.idx).aopen = true;
        if(data.idx != idx) {
            // 别人开启
            getPC(data.idx).index = 0;
        }else {
            // 自己开启
        }
    });
    EE.on('Rad', data => {
        getU_Dom(data.idx)._ai.src = 'img/microphone_off.png';
        getU_Kt(data.idx).aopen = false;
        if(data.idx != idx) {
            // 别人关闭
            if(getPC(data.idx).tracks[0]){
                getPC(data.idx).tracks[0].stop();
                getPC(data.idx).tracks[0] = null;
            }
            // TO-DO
        }else {
            // 自己关闭
            Media.audio_off();
            ab.firstElementChild.src = 'img/microphone_off.png';
        }
    });
    EE.on('rvo', data => {
        // 请求开启视频
        if(data.ok) {
            // 请求成功
            vb.firstElementChild.src = 'img/webcam_on.png';
            MDom.att('video', getVideoStream());
            sendOffers();
        }else{
            // 请求失败
            Media.video_off();
        }
    });
    EE.on('rvd', data => {
        // 请求关闭声音
        if(data.ok) {
        }
    });
    EE.on('Rvo', data => {
        getU_Dom(data.idx)._vi.src = 'img/webcam_on.png';
        getU_Kt(data.idx).vopen = true;
        if (data.idx != idx) {
            // 别人开启
            getPC(data.idx).index = 1;
        }else {
            // 自己开启
        }
    });
    EE.on('Rvd', data => {
        getU_Dom(data.idx)._vi.src = 'img/webcam_off.png';
        getU_Kt(data.idx).vopen = false;
        if (data.idx != idx) {
            // 别人关闭
            if(getPC(data.idx).tracks[1]){
                getPC(data.idx).tracks[1].stop();
                getPC(data.idx).tracks[1] = null;
            }
            // TO-DO
            MDom.att(data.idx, null);
            if(getU_Kt(data.idx).aopen) MDom.att(data.idx, getRemoteStream(data.idx), true);
        }else {
            // 自己关闭
            Media.video_off();
            vb.firstElementChild.src = 'img/webcam_off.png';
            MDom.att('video', null);
        }
    });
    EE.on('rice', data => {

    });
    EE.on('Rice', data => {
        getPC(data.idx).addIceCandidate(new window.RTCIceCandidate(data.ice));
    });
    EE.on('rsdp', data => {

    });
    EE.on('Rsdp', data => {
        if(data.back) {
            // 接到Offer
            sendAnswer(data.idx, data.sdp);
        }else{
            // 接到Answer
            getPC(data.idx).setRemoteDescription(new window.RTCSessionDescription(data.sdp));
        }
    });
    EE.on('init', data => {
        if(data.idx != idx) {
            getPC(data.idx)._initA = data.initA;
        }
    });
};


// ===================== 通信区 =====================

WS.onopen = () => {     // 启动后告知ws,并拉取kt
    WS.send(JSON.stringify({des: 'uin', sid: sid, idx: idx}));
    ws_opened();
    ee_init();
};
WS.onmessage = e => {     // e.data
    var m = JSON.parse(e.data);
    if(m.des)
        EE.emit(m.des, m.data);
};
WS.onclose = () => {
    console.log('closed');
};
WS.onerror = e => {
    console.log(e);
};