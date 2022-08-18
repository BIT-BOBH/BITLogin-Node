const BITLogin = require('./BITLogin');

const TestAccount = "1120210001";
const TestPassword = "abcdefg";

async function Main(){
    let loginInstance = new BITLogin();

    // step1: init context
    let res = await loginInstance.InitContext();
    if(!res){
        console.log("Failed to init context!");
        return;
    }

    // step2: login after check captcha
    let needCaptcha = await loginInstance.CheckCaptcha(TestAccount);
    let captcha = "";
    if(needCaptcha){
        let captcha = await loginInstance.GetCaptcha();
        // input captcha
        
    }

    
}

Main();