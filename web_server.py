#! /usr/bin/python
# -*- coding:utf-8 -*-

from tornado.web import Application, RequestHandler, url, StaticFileHandler
from tornado.websocket import WebSocketHandler
from tornado.ioloop import IOLoop
from tornado.httpserver import HTTPServer
import os
import random
import json

# windows 系统下 tornado 使用 使用 SelectorEventLoop
import platform

if platform.system() == 'Windows':
    import asyncio

    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# 课堂类
class Kt():
    
    # 一个课堂为一个Kt对象
    id = 0      # 课堂号
    inc = 0     # 成员号计数
    cnc = 0     # 成员个数
    ds = None   # 最多一个投屏 None表示没有人开启投屏
    dsable = True   # 是否允许成员开启投屏
    dmable = True   # 是否允许成员开启弹幕
    Ktm = None  # 课堂的主持
    Ktu = []    # 课堂的成员

    # 初始化, id: {int}课堂号
    def nkt(self, id):
        if self.id == 0 and id != 0:
            self.id = id
            self.Ktm = {'name': '主持人', 'ws': None, 'aopen': False, 'vopen': False} # 默认
            self.Ktu = []   # 指向新的数组

    # 成员加入, name: {str}成员名; @{int}成员号
    def nme(self, name):
        idx = self.inc
        self.cnc += 1
        self.inc += 1
        self.Ktu.append({'name': name, 'ws': None, 'aopen': False, 'vopen': False, 'avable': True, 'dsable': True, 'dmable': True})
        return idx

    # 成员退出, idx: {int}成员号
    def dme(self, idx):
        self.cnc -= 1
        self.Ktu[idx] = None
        if self.ds == idx:
            self.ds = None

# dict{sid: kt}, sid: {str}课堂号; kt: {Kt}课堂对象
Kts = {}

# 新建课堂, @{str}课堂号
def newKt():
    global Kts
    id = random.randint(1000, 9999)
    sid = str(id)
    t = 0
    mt = 10
    while sid in Kts:
        t += 1
        if t >= mt:
            return ''
        id = random.randint(1000, 9999)
        sid = str(id)
    nkt = Kt()
    nkt.nkt(id)
    Kts[sid] = nkt
    return sid
    
# 成员加入Kt, sid: {str}课堂号; name: {str}成员名
def joinKt(sid, name):
    global Kts
    if sid not in Kts:
        return -1
    kt = Kts[sid]
    return kt.nme(name)

# 获取kt信息, idx: {int}成员号; @{dict}kt信息
def getKt(kt, idx):
    if idx == -1:
        r = {'cnc': kt.cnc, 'ds': kt.ds, 'dsable': kt.dsable, 'dmable': kt.dmable, 'ktm': None, 'ktu': []}
        r['ktm'] = {'name': kt.Ktm['name'], 'aopen': kt.Ktm['aopen'], 'vopen': kt.Ktm['vopen'], 'avable': True, 'dsable': True, 'dmable': True}
        for u in kt.Ktu:
            if u:
                r['ktu'].append({'name': u['name'], 'aopen': u['aopen'], 'vopen': u['vopen'], 'avable': u['avable'], 'dsable': u['dsable'], 'dmable': u['dmable']})
            else:
                r['ktu'].append(None)
        return r
    r = {'cnc': kt.cnc, 'ds': kt.ds, 'dsable': kt.dsable and kt.Ktu[idx]['dsable'], 'dmable': kt.dmable and kt.Ktu[idx]['dmable'], 'ktm': None, 'ktu': []}
    r['ktm'] = {'name': kt.Ktm['name'], 'aopen': kt.Ktm['aopen'], 'vopen': kt.Ktm['vopen'], 'avable': True}
    for u in kt.Ktu:
        if u:
            r['ktu'].append({'name': u['name'], 'aopen': u['aopen'], 'vopen': u['vopen'], 'avable': u['avable']})
        else:
            r['ktu'].append(None)
    return r


# 向R发送s, s: {str}消息内容
def Send2kt_R(kt, s):
    if kt.Ktm and kt.Ktm['ws']:
        kt.Ktm['ws'].write_message(s)
    for u in kt.Ktu:
        if u and u['ws']:
            u['ws'].write_message(s)

# 向u发送s, s: {str}消息内容
def Send2kt_u(kt, s):
    for u in kt.Ktu:
        if u and u['ws']:
            u['ws'].write_message(s)

# 向i发送s, idx: {int}成员号; s: {str}消息内容
def Send2kt_i(kt, idx, s):
    if idx == -1:
        if kt.Ktm and kt.Ktm['ws']:
            kt.Ktm['ws'].write_message(s)
    elif 0 <= idx <= kt.inc:
        if kt.Ktu[idx] and kt.Ktu[idx]['ws']:
            kt.Ktu[idx]['ws'].write_message(s)

class IndexHandler(RequestHandler): # 加载主页

    # /                                     显示主页
    # /?action=newkt                        创建课堂
    # /?action=join&sid=xxxx&name=name      加入课堂
    def get(self):
        action = self.get_query_argument('action', '')
        if action == '':
            with open('index.html', encoding='utf-8') as html:
                self.finish(html.read())
        elif action == 'newkt':
            sid = newKt()
            r = {'action': 'newkt', 'success': False, 'sid': sid}
            if sid != '':
                r['success'] = True
            self.finish(json.dumps(r))

        elif action == 'join':
            sid = self.get_query_argument('sid', '')
            name = self.get_query_argument('name', '')
            r = {'action': 'join', 'success': False, 'msg': '参数错误', 'sid': sid, 'name': name}
            if sid != '' and name != '':
                idx = joinKt(sid, name)
                if idx == -1:
                    r['msg'] = '房间号错误'
                else:
                    r['success'] = True
                    r['msg'] = '加入成功'
                    r['idx'] = idx
            self.finish(json.dumps(r))


class KtHandler(RequestHandler):

    # /kt
    # /kt?type=m&sid=xxxx               主持
    # /kt?type=n&sid=xxxx&idx=x+        成员
    def get(self):
        t = self.get_query_argument('type', '')
        if t == 'm':
            sid = self.get_query_argument('sid', '')
            self.write('<script>var sid=\'' + sid + '\'</script>')    #sid是string
            with open('ktm.html', encoding='utf-8') as html:
                self.finish(html.read())
        elif t == 'n':
            sid = self.get_query_argument('sid', '')
            idx = self.get_query_argument('idx', '')
            self.write('<script>var sid = \'' + sid + '\', idx = ' + idx + ';</script>')
            with open('ktn.html', encoding='utf-8') as html:
                self.finish(html.read())
        else:
            self.finish('错误')


class WsHandler(WebSocketHandler):
    
    def on_message(self, message):
        rr = json.loads(message)
        # 假设rr都符合要求
        # 为了确保安全, 可以使用try...
        des = rr['des']
        if des == 'uin' or des == 'min':
            sid = rr['sid']
        else:
            sid = self.sid
        rs = {'des': des, 'data': {'ok': True}}
        if sid in Kts:
            kt = Kts[sid]
            if des == 'uin':
                idx = rr['idx']
                if 0 <= idx < kt.inc and kt.Ktu[idx] and kt.Ktu[idx]['ws'] == None:
                    Send2kt_R(kt, json.dumps({'des': 'Rin', 'data': {'idx': idx, 'name': kt.Ktu[idx]['name']}}))
                    self.sid = sid
                    self.idx = idx
                    kt.Ktu[idx]['ws'] = self
                else:
                    rs['data']['ok'] = False
            elif des == 'min':
                if kt.Ktm['ws'] == None:
                    self.sid = sid
                    self.idx = -1
                    kt.Ktm['ws'] = self
                else:
                    rs['data']['ok'] = False
            elif des == 'uout':
                idx = self.idx
                if 0 <= idx < kt.inc and kt.Ktu[idx]:
                    kt.dme(idx)
                    Send2kt_R(kt, json.dumps({'des': 'Rout', 'data': {'idx': idx}}))
                else:
                    rs['data']['ok'] = False
            elif des == 'mout':
                if self.idx == -1 and self.sid == sid:
                    Send2kt_u(kt, json.dumps({'des': 'Rover'}))
                    Kts.pop(sid)
                else:
                    rs['data']['ok'] = False
            elif des == 'rkt':
                idx = self.idx
                if ((idx == -1 and kt.Ktm) or (0 <= idx < kt.inc and kt.Ktu[idx])):
                    rs['data']['data'] = getKt(kt, idx)
                else:
                    rs['data']['ok'] = False
            elif des == 'rrn':
                idx = self.idx
                if ((idx == -1 and kt.Ktm and kt.Ktm['name'] != rr['name']) or (0 <= idx < kt.inc and kt.Ktu[idx] and kt.Ktu[idx]['name'] != rr['name'])):
                    if idx == -1:
                        kt.Ktm['name'] = rr['name']
                    else:
                        kt.Ktu[idx]['name'] = rr['name']
                    Send2kt_R(kt, json.dumps({'des': 'Rrn', 'data': {'idx': idx, 'name': rr['name']}}))
                else:
                    rs['data']['ok'] = False
            elif des == 'rdm':
                idx = self.idx
                if kt.dmable and (idx == -1 or (0 <= idx < kt.inc and kt.Ktu[idx] and kt.Ktu[idx]['dmable'])):
                    Send2kt_R(kt, json.dumps({'des': 'Rdm', 'data': {'idx': idx, 'msg': rr['msg']}}))
                else:
                    rs['data']['ok'] = False
            elif des == 'mdmo':
                idx = rr['idx']
                rs['data']['idx'] = idx
                if self.idx == -1 and ((idx == -1 and kt.dmable == False) or (kt.dmable and 0 <= idx < kt.inc and kt.Ktu[idx] and kt.Ktu[idx]['dmable'] == False)):
                    if idx == -1:
                        kt.dmable = True
                        Send2kt_R(kt, json.dumps({'des': 'Rdmo'}))
                    else :
                        kt.Ktu[idx]['dmable'] = True
                else:
                    rs['data']['ok'] = False
            elif des == 'mdmd':
                idx = rr['idx']
                rs['data']['idx'] = idx
                if self.idx == -1 and ((idx == -1 and kt.dmable) or (0 <= idx < kt.inc and kt.Ktu[idx] and kt.Ktu[idx]['dmable'])):
                    if idx == -1:
                        kt.dmable = False
                        Send2kt_R(kt, json.dumps({'des': 'Rdmd'}))
                    else :
                        kt.Ktu[idx]['dmable'] = False
                else:
                    rs['data']['ok'] = False
            elif des == 'rds':
                idx = self.idx
                ds = rr['ds']
                rs['data']['ds'] = ds
                if kt.dsable and ((kt.ds == None and ds == idx) or (kt.ds == idx and ds == None)) and (idx == -1 or (0 <= idx < kt.inc and kt.Ktu[idx] and kt.Ktu[idx]['dsable'])):
                    kt.ds = ds
                    Send2kt_R(kt, json.dumps({'des': 'Rds', 'data': {'ds': ds}}))
                else:
                    rs['data']['ok'] = False
            elif des == 'mdso':
                idx = rr['idx']
                rs['data']['idx'] = idx
                if self.idx ==-1 and ((idx == -1 and kt.dsable == False) or (kt.dsable and 0 <= idx < kt.inc and kt.Ktu[idx] and kt.Ktu[idx]['dsable'] == False)):
                    if idx == -1:
                        kt.dsable = True
                        Send2kt_R(kt, json.dumps({'des': 'Rdso'}))
                    else :
                        kt.Ktu[idx]['dsable'] = True
                else:
                    rs['data']['ok'] = False
            elif des == 'mdsd':     # TO-DO 关闭需要关闭的投屏
                idx = rr['idx']
                rs['data']['idx'] = idx
                if self.idx ==-1 and ((idx == -1 and kt.dsable) or (0 <= idx < kt.inc and kt.Ktu[idx] and kt.Ktu[idx]['dsable'])):
                    if idx == -1:   # INFO 关闭投屏功能
                        kt.dsable = False
                        kt.ds = None
                        Send2kt_R(kt, json.dumps({'des': 'Rdsd'}))
                    else :          # INFO 禁止某人投屏
                        kt.Ktu[idx]['dsable'] = False
                        if idx == kt.ds:    # 被禁止的人正在投屏
                            kt.ds = None
                            Send2kt_R(kt, json.dumps({'des': 'Rds', 'data': {'ds': None}}))
                else:
                    rs['data']['ok'] = False
            elif des == 'mavo':
                idx = rr['idx']
                if self.idx == -1 and 0 <= idx < kt.inc and kt.Ktu[idx] and kt.Ktu[idx]['avable'] == False:
                    kt.Ktu[idx]['avable'] = True
                    Send2kt_R(kt, json.dumps({'des': 'Ravo', 'data': {'idx': idx}}))
                else:
                    rs['data']['ok'] = False
            elif des == 'mavd':     # TO-DO 关闭需要关闭的音视频
                idx = rr['idx']
                if self.idx == -1 and 0 <= idx < kt.inc and kt.Ktu[idx] and kt.Ktu[idx]['avable']:
                    kt.Ktu[idx]['avable'] = False
                    if kt.Ktu[idx]['aopen']:
                        kt.Ktu[idx]['aopen'] = False
                        Send2kt_R(kt, json.dumps({'des': 'Rad', 'data': {'idx': idx}}))
                    if kt.Ktu[idx]['vopen']:
                        kt.Ktu[idx]['vopen'] = False
                        Send2kt_R(kt, json.dumps({'des': 'Rvd', 'data': {'idx': idx}}))
                    Send2kt_R(kt, json.dumps({'des': 'Ravd', 'data': {'idx': idx}}))    # INFO 告知所有人, idx被禁止音视频
                else:
                    rs['data']['ok'] = False
            elif des == 'rao':
                idx = self.idx
                if ((idx == -1 and kt.Ktm and kt.Ktm['aopen'] == False) or (0 <= idx < kt.inc and kt.Ktu[idx] and kt.Ktu[idx]['avable'] and kt.Ktu[idx]['aopen'] == False)):
                    if idx == -1:
                        kt.Ktm['aopen'] = True
                    else:
                        kt.Ktu[idx]['aopen'] = True
                    Send2kt_R(kt, json.dumps({'des': 'Rao', 'data': {'idx': idx}}))
                else:
                    rs['data']['ok'] = False
            elif des == 'rad':
                idx = self.idx
                if ((idx == -1 and kt.Ktm and kt.Ktm['aopen']) or (0 <= idx < kt.inc and kt.Ktu[idx] and kt.Ktu[idx]['aopen'])):
                    if idx == -1:
                        kt.Ktm['aopen'] = False
                    else:
                        kt.Ktu[idx]['aopen'] = False
                    Send2kt_R(kt, json.dumps({'des': 'Rad', 'data': {'idx': idx}}))
                else:
                    rs['data']['ok'] = False
            elif des == 'rvo':
                idx = self.idx
                if ((idx == -1 and kt.Ktm and kt.Ktm['vopen'] == False) or (0 <= idx < kt.inc and kt.Ktu[idx] and kt.Ktu[idx]['avable'] and kt.Ktu[idx]['vopen'] == False)):
                    if idx == -1:
                        kt.Ktm['vopen'] = True
                    else:
                        kt.Ktu[idx]['vopen'] = True
                    Send2kt_R(kt, json.dumps({'des': 'Rvo', 'data': {'idx': idx}}))
                else:
                    rs['data']['ok'] = False
            elif des == 'rvd':
                idx = self.idx
                if ((idx == -1 and kt.Ktm and kt.Ktm['vopen']) or (0 <= idx < kt.inc and kt.Ktu[idx] and kt.Ktu[idx]['vopen'])):
                    if idx == -1:
                        kt.Ktm['vopen'] = False
                    else:
                        kt.Ktu[idx]['vopen'] = False
                    Send2kt_R(kt, json.dumps({'des': 'Rvd', 'data': {'idx': idx}}))
                else:
                    rs['data']['ok'] = False
            elif des == 'rice':
                idx = self.idx
                if idx != rr['idx'] :
                    Send2kt_i(kt, rr['idx'], json.dumps({'des': 'Rice', 'data': {'idx': idx, 'ice': rr['ice']}}))
                else:
                    rs['data']['ok'] = False
            elif des == 'rsdp':
                idx = self.idx
                if idx != rr['idx'] :
                    Send2kt_i(kt, rr['idx'], json.dumps({'des': 'Rsdp', 'data': {'idx': idx, 'sdp': rr['sdp'], 'back': rr['back']}}))
                else:
                    rs['data']['ok'] = False
            elif des == 'init':
                idx = self.idx
                if idx != rr['idx']:
                    Send2kt_i(kt, rr['idx'], json.dumps({'des': 'init', 'data': {'idx': idx, 'initA': rr['initA']}}))
                else:
                    rs['data']['ok'] = False
        else:
            rs['data']['ok'] = False
        self.write_message(json.dumps(rs))  # self是正在进行ws的对象
    
    def on_close(self):
        try:
            sid = self.sid
            idx = self.idx
            if sid in Kts:
                kt = Kts[sid]
                if idx == -1 and kt.Ktm:    # 课堂未正常关闭
                    Send2kt_u(kt, json.dumps({'des': 'Rover'}))
                    Kts.pop(sid)
                elif 0 <= idx <= kt.inc and kt.Ktu[idx]:
                    kt.dme(idx)
                    Send2kt_R(kt, json.dumps({'des': 'Rout', 'data': {'idx': idx}}))
        except AttributeError as e:
            pass


if __name__ == '__main__':
    path = os.path.dirname(__file__)
    app = Application(
        [
            (r'/([^\.]+\.[^\.]+)', StaticFileHandler, {'path': path}),
            (r'/', IndexHandler),
            (r'/kt', KtHandler),
            (r'/ws', WsHandler)
        ],
        static_path = path
    )

    http_server = HTTPServer(app)
    http_server.listen(8000)

    IOLoop.current().start()