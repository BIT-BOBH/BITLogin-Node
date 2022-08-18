# BITLogin-Node

北理工统一身份验证第三方接入的NodeJS实现

基于对网站抓包分析实现，支持验证码登陆

可以用来作为校园实名绑定的接口

## 用法

引入`BITLogin.js`

参见`example.js`

```javascript
const BITLogin = require('./BITLogin');
const fs = require('fs');
const readline = require('readline/promises');

const TestAccount = "1120210001";
const TestPassword = "1234";

async function Main(){
    let loginInstance = new BITLogin();

    // step1: init context
    let res = await loginInstance.InitContext();
    if(!res){
        console.log("Failed to init context!");
        return;
    }
    console.log("Init context ok!");

    // step2: login after check captcha
    let needCaptcha = await loginInstance.CheckCaptcha(TestAccount);
    let captcha = "";
    if(needCaptcha){
        let captchaImg = await loginInstance.GetCaptcha();
        fs.writeFileSync("./captcha.jpeg", Buffer.from(captchaImg, 'base64'));
        // input captcha
        console.log("Please input captcha(See captcha.jpeg)!");
        const cin = readline.createInterface(process.stdin,process.stdout);
        captcha = await cin.question("Captcha:");
        console.log(`Your input is ${captcha}`);
        cin.close();
    }

    // step3: Login!
    let loginRes = await loginInstance.DoLogin(TestAccount, TestPassword, captcha);
    if(loginRes.success){
        console.log("Login success! Cookies at loginRes.respHeader!");
    }else{
        console.log(`Login failed! Code: ${loginRes.statusCode}, Reason: ${loginRes.errorReason}!`);
    }
}

Main();
```

## 作者

BobH