const encryptPassword = require('./encrypt').encryptPassword;
const axios = require('axios').default;
const fs = require('fs');

const API_INDEX = "https://login.bit.edu.cn/authserver/login";
const API_LOGIN = "https://login.bit.edu.cn/authserver/login";
const API_CAPTCHA_CHECK = "https://login.bit.edu.cn/authserver/checkNeedCaptcha.htl";
const API_CAPTCHA_GET = "https://login.bit.edu.cn/authserver/getCaptcha.htl";
const DefaultHeader = {
    'Referer' : 'https://login.bit.edu.cn/authserver/login',
    'Host' : 'login.bit.edu.cn',
    'User-Agent' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:103.0) Gecko/20100101 Firefox/103.0'
};

function CopyObject(oriObject){
    return JSON.parse(JSON.stringify(oriObject));
}

function GetSaltParam(html){
    let findKey = `id="pwdEncryptSalt" value=`;
    let start = html.indexOf(findKey);
    if(start == -1) return "";
    let cnt = 0;
    let pos = [-1,-1];
    for(let i=start+findKey.length; cnt < 2;i++){
        if(html[i] == `"`){
            pos[cnt++] = i;
        }
    }
    let res = html.substr(pos[0] + 1, pos[1] - pos[0] - 1);
    return res;
}

function GetExecution(html){
    let findKey = `name="execution" value=`;
    let start = html.indexOf(findKey);
    if(start == -1) return "";
    let cnt = 0;
    let pos = [-1,-1];
    for(let i=start+findKey.length; cnt < 2;i++){
        if(html[i] == `"`){
            pos[cnt++] = i;
        }
    }
    let res = html.substr(pos[0] + 1, pos[1] - pos[0] - 1);
    return res;
}

class BITLogin{
    constructor(){
        this.context = {};
        this.account = "";
        this.password = "";
        this.inited = false;
    }
    async InitCookies(){
        try{
            if(this.context.cookies != undefined) return true;
            let resp = await axios.get(API_INDEX);
            this.context.cookies = resp.headers['set-cookie'].join(';');
            this.context.cookies = this.context.cookies.replace('HttpOnly', '');
            return true;
        }catch(err){
            return false;
        }
    }

    async InitParams(){
        try{
            let headerWithCookies = CopyObject(DefaultHeader);
            headerWithCookies['Cookie'] = this.context.cookies;
            let resp = await axios.get(API_INDEX,{
                headers: headerWithCookies
            });
            this.context.pwdEncryptSalt = GetSaltParam(resp.data);
            return true;
        }catch(err){
            return false;
        }
    }

    async InitContext(){
        if(this.inited) return true;

        // Try get JSESSIONID and route
        let res = await this.InitCookies();
        if(!res) return false;

        // Get encryptSalt
        res = await this.InitParams();
        if(!res) return false;

        this.inited = true;
        return true;
    }

    /* 
        CheckCaptcha(username)
        Return true if server requires captcha code
    */
    async CheckCaptcha(username){
        let api = API_CAPTCHA_CHECK + `?username=${username}&_=${Date.now()}`;
        try{
            let headerWithCookies = CopyObject(DefaultHeader);
            headerWithCookies['Cookie'] = this.context.cookies;
            let resp = await axios.get(api,{
                headers: headerWithCookies
            });
            return resp.data['isNeed'];
        }catch(err){
            return false;
        }
    }

    /* 
        GetCaptcha()
        Return Captcha Image Data with format of Base64
        Image is jpeg format
    */
    async GetCaptcha(){
        let api = API_CAPTCHA_GET + `?${Date.now()}`;
        try{
            let headerWithCookies = CopyObject(DefaultHeader);
            headerWithCookies['Cookie'] = this.context.cookies;
            let resp = await axios.get(api,{
                responseType: 'arraybuffer',
                headers: headerWithCookies
            });
            return resp.data.toString('base64');
        }catch(err){
            return "";
        }
    }

    async DoLogin(){

    }
}

module.exports = BITLogin;