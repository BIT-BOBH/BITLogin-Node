const BITLogin = require('./BITLogin');

async function Main(){
    let loginInstance = new BITLogin();

    // step1: init context
    let res = await loginInstance.InitContext();
    if(!res){
        console.log("Failed to init context!");
        return;
    }

    
}

Main();