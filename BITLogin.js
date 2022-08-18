const encryptPassword = require('./encrypt').encryptPassword;
const axios = require('axios').default;
const qs = require('qs');

const API_INDEX = "https://login.bit.edu.cn/authserver/login";
const API_LOGIN = "https://login.bit.edu.cn/authserver/login";
const API_CAPTCHA_CHECK = "https://login.bit.edu.cn/authserver/checkNeedCaptcha.htl";
const API_CAPTCHA_GET = "https://login.bit.edu.cn/authserver/getCaptcha.htl";
const DefaultHeader = {
    'Referer': 'https://login.bit.edu.cn/authserver/login', 
    'Host': 'login.bit.edu.cn', 
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:103.0) Gecko/20100101 Firefox/103.0'
};

function CopyObject(oriObject){
    return JSON.parse(JSON.stringify(oriObject));
}

function GetHtmlSaltParam(html){
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

function GetHtmlExecutionParam(html){
    let findKey = `name="execution" value=`;
    let start = html.indexOf(findKey);
    if(start == -1) return "";
    let cnt = 0;
    let pos = [-1,-1];
    for(let i=start + findKey.length; cnt < 2;i++){
        if(html[i] == `"`){
            pos[cnt++] = i;
        }
    }
    let res = html.substr(pos[0] + 1, pos[1] - pos[0] - 1);
    return res;
}

function GetHtmlErrorReason(html){
    let findKey = `<span id="showErrorTip">`;
    let start = html.indexOf(findKey);
    if(start == -1) return "";
    let count = 0;
    let i = start;
    do{
        if(html[i] == '<' && html[i+1] == 's'){
            count++;
        }
        if(html[i] == '<' && html[i+1] == '/'){
            count--;
        }
        i++;
    }while(count > 0);
    let res = html.substr(start + findKey.length, i - start - 1 - findKey.length);
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
            this.context.pwdEncryptSalt = GetHtmlSaltParam(resp.data);
            return true;
        }catch(err){
            return false;
        }
    }

    async GetCurExecution(){
        try{
            let headerWithCookies = CopyObject(DefaultHeader);
            headerWithCookies['Cookie'] = this.context.cookies;
            let resp = await axios.get(API_INDEX,{
                headers: headerWithCookies
            });
            return GetHtmlExecutionParam(resp.data);
        }catch(err){
            return "";
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
    /*
        DoLogin(username, password, captcha = "", rememberMe = true)
        Use username & password & captcha to request login api
        The return value should be like this:
        {
            success: (true or false),
            statusCode: (api status code),
            errorReason: (string that indicates the error reason, probably 验证码错误、密码错误、冻结etc.)
            respHeader: (if success, server will return a header with new cookies)
        }
     */
    async DoLogin(username, password, captcha = "", rememberMe = true){
        let encryptedPassword = encryptPassword(password, this.context.pwdEncryptSalt);
        let headerWithCookies = {};
        headerWithCookies['Cookie'] = this.context.cookies;
        headerWithCookies['Content-Type'] = 'application/x-www-form-urlencoded';
        if(captcha == null) captcha = "";
        let ret = {
            success: false,
            statusCode: -1,
            errorReason: "unknown error",
            respHeader: {}
        };
        try{
            let cur_execution = this.GetCurExecution();
            let param = {
                username: username,
                password: encryptedPassword,
                captcha: captcha,
                rememberMe: rememberMe,
                _eventId: "submit",
                cllt: "userNameLogin",
                dllt: "generalLogin",
                lt: "",
                execution: await cur_execution
            };

            let resp = await axios.post(API_LOGIN, qs.stringify(param), {
                headers: headerWithCookies,
                validateStatus: false,
                maxRedirects: 0  //fucking stupid problem cost me 1 hour!
            });
            if(resp.status == 302){
                // login successfully
                ret.success = true;
                ret.statusCode = resp.status;
                ret.respHeader = resp.headers;
                ret.errorReason = "";
                return ret;
            }else if(resp.status == 401){
                ret.success = false;
                ret.statusCode = resp.status;
                ret.respHeader = resp.headers;
                ret.errorReason = GetHtmlErrorReason(resp.data);
                return ret;
            }else{
                ret.success = false;
                ret.statusCode = resp.status;
                ret.respHeader = resp.headers;
                ret.errorReason = GetHtmlErrorReason(resp.data);
                return ret;
            }
        }catch(err){
            ret.errorReason = err.message;
            ret.success = false;
            return ret;
        }
    }
}

module.exports = BITLogin;