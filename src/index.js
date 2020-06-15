var cc = document.getElementById("cc"),     // 创建课堂按钮
    jc = document.getElementById("jc"),     // 加入课堂按钮
    dd = document.getElementById("dd"),     // 加入课堂隐藏的设置界面
    dr = document.getElementById("dr"),     // 房间号
    dn = document.getElementById("dn"),     // 名字
    dj = document.getElementById("dj");     // 确认加入按钮

jc.onclick = () => {
    dd.style['display'] = 'block';
}

dd.onclick = (e) => {
    if (e.target == dd)
        dd.style['display'] = 'none';
}

cc.onclick = () => {
    var http = new XMLHttpRequest();
    var t = setTimeout(()=>{alert("请求超时")}, 2000);
    http.onreadystatechange = ()=> {
        if (http.readyState==4 && http.status==200) {
            clearTimeout(t);
            var g = JSON.parse(http.responseText);
            if (g.success) {
                window.location.href = "/kt?type=m&sid=" + g.sid;
            }else{
                alert("创建失败");
            }
        }
    }
    http.open("GET", "/?action=newkt", true);
    http.send();
}

dj.onclick = () => {
    if (dr.value.length >= 4 && dn.value.length > 0) {
        var http = new XMLHttpRequest();
        var t = setTimeout(()=>{alert("请求超时")}, 2000);
        http.onreadystatechange = () => {
            if (http.readyState==4 && http.status==200) {
                clearTimeout(t);
                var g = JSON.parse(http.responseText);
                if (g.success) {
                    window.location.href = "/kt?type=n&sid=" + g.sid + "&idx=" + g.idx;
                }else{
                    alert("加入失败," + g.msg);
                }
            }
        }
        http.open("GET", "/?action=join&sid=" + dr.value + "&name=" + dn.value, true);
        http.send();
    }else {
        alert("输入错误");
    }
}