// Last edit: Wed, 15 Nov 17 13:58:17 -0500
function rfsn_getQS(e){e=e.replace(/[\[]/,"\\[").replace(/[\]]/,"\\]");var t=new RegExp("[\\?&]"+e+"=([^&#]*)"),n=t.exec(location.search);return n===null?"":decodeURIComponent(n[1].replace(/\+/g," "))}function rfsn_trackCartMapping(e){if(typeof localStorage.rfsn_aid=="undefined"||localStorage.rfsn_ci!==e.cid){_pullLocalStorage();if(e.aid)localStorage.setItem("rfsn_aid",e.aid);if(e.cid)localStorage.setItem("rfsn_ci",e.cid);if(e.cs)localStorage.setItem("rfsn_cs",e.cs);_pushLocalStorage()}}
function _pushLocalStorage(){if(typeof xdLocalStorage=="undefined")return;xdLocalStorage.getItem("rfsn_ci_pub_cf23d74249251f6d1f4b",function(a){if(parseInt(localStorage.rfsn_ci||0)>parseInt(a.value||0)){if(typeof localStorage.rfsn_aid!=="undefined")xdLocalStorage.setItem("rfsn_aid_pub_cf23d74249251f6d1f4b",localStorage.rfsn_aid);if(typeof localStorage.rfsn_ci!=="undefined")xdLocalStorage.setItem("rfsn_ci_pub_cf23d74249251f6d1f4b",localStorage.rfsn_ci);if(typeof localStorage.rfsn_cs!=="undefined")xdLocalStorage.setItem("rfsn_cs_pub_cf23d74249251f6d1f4b",localStorage.rfsn_cs);
if(typeof localStorage.rfsn_cti!=="undefined")xdLocalStorage.setItem("rfsn_cti_pub_cf23d74249251f6d1f4b",localStorage.rfsn_cti);if(typeof localStorage.rfsn_src!=="undefined")xdLocalStorage.setItem("rfsn_src_pub_cf23d74249251f6d1f4b",localStorage.rfsn_src)}})}
function _pullLocalStorage(){if(typeof xdLocalStorage=="undefined")return;xdLocalStorage.getItem("rfsn_ci_pub_cf23d74249251f6d1f4b",function(a){if(parseInt(localStorage.rfsn_ci||0)<=parseInt(a.value||0)){xdLocalStorage.getItem("rfsn_aid_pub_cf23d74249251f6d1f4b",function(a){if(a.value&&typeof a.value!=="undefined")localStorage.rfsn_aid=a.value});xdLocalStorage.getItem("rfsn_ci_pub_cf23d74249251f6d1f4b",function(a){if(a.value&&typeof a.value!=="undefined")localStorage.rfsn_ci=a.value});xdLocalStorage.getItem("rfsn_cs_pub_cf23d74249251f6d1f4b",function(a){if(a.value&&
typeof a.value!=="undefined")localStorage.rfsn_cs=a.value});xdLocalStorage.getItem("rfsn_cti_pub_cf23d74249251f6d1f4b",function(a){if(a.value&&typeof a.value!=="undefined")localStorage.rfsn_cti=a.value});xdLocalStorage.getItem("rfsn_src_pub_cf23d74249251f6d1f4b",function(a){if(a.value&&typeof a.value!=="undefined")localStorage.rfsn_src=a.value})}})}
window.r_tracker=window.r_tracker||function(){this.trans=[];this.items=[];this.customer=[];this._has_error=false;this._test_mode=false;this._initTracking=function(){this._throw_log("Starting tracking");var sid="";var rtest="";var lp="";var r="";var rfsn=rfsn_getQS("rfsn");var subid=rfsn_getQS("subid");if(subid!=="")sid="&subid="+subid;var rf_test=rfsn_getQS("rf_test");if(rf_test!=="")rtest="&rf_test="+rf_test;if(document.URL)lp="&lp="+escape(document.URL);if(document.referrer)r="&r="+
escape(document.referrer);if(navigator.userAgent)ua="&ua="+escape(navigator.userAgent);var rfsn_lsts_timeout=0;var current_rfsn_lsts=(new Date).getTime();if(typeof localStorage.current_rfsn_lsts!=="undefined")rfsn_lsts_timeout=(current_rfsn_lsts-localStorage.current_rfsn_lsts)/1E3;_pullLocalStorage();if(rfsn&&(rfsn_lsts_timeout>60||rfsn_lsts_timeout===0))rfsnLoadScript("https://www.refersion.com/tracker/v3/click/"+rfsn+".js?v="+Math.floor(Math.random()*1E5)+sid+rtest+lp+r+ua,function(){_pullLocalStorage();
if(typeof localStorage.rfsn_ci!=="undefined"&&typeof localStorage.rfsn_src=="undefined")localStorage.setItem("rfsn_src","RFSN_JS_V3");localStorage.setItem("current_rfsn_lsts",current_rfsn_lsts);if(rf_test!=="")alert("Success! Your Refersion click was tracked, please continue with your test order.");_pushLocalStorage()})},this._addCart=function(cart_id){_pullLocalStorage();if(typeof cart_id!=="undefined"&&typeof localStorage.rfsn_ci!=="undefined"){if(typeof localStorage.rfsn_cti=="undefined"||localStorage.rfsn_cti!==
cart_id){_pullLocalStorage();localStorage.setItem("rfsn_cti",cart_id);_pushLocalStorage();cart_id="&c="+cart_id;click_id="&ci="+localStorage.rfsn_ci;affiliate_id="&aid="+localStorage.rfsn_aid;source="&src="+(localStorage.rfsn_src||"RFSN_JS_V3");rfsnLoadScript("https://www.refersion.com/tracker/v3/track_cart.js?v="+Math.floor(Math.random()*1E5)+cart_id+click_id+affiliate_id+source,function(){})}}else this._throw_log("No click captured under cart_id "+cart_id)},this._addTrans=function(entry){if(this.trans.length>
1)this._throw_error("Only one transaction allowed");if(entry.order_id&&entry.currency_code)this.trans=[entry.order_id,entry.shipping||0,entry.tax||0,entry.discount||0,entry.discount_code||"",entry.currency_code];else{if(!entry.order_id)this._throw_error("order_id is required");if(!entry.currency_code)this._throw_error("currency_code is required")}},this._addCustomer=function(entry){this.customer=[entry.first_name||"",entry.last_name||"",entry.email||"",entry.ip_address||""]},this._addItem=function(entry){this.items.push([entry.sku,
entry.quantity,entry.price])},this._testMode=function(e){if(e===true){this._test_mode="1";this._throw_log("Test mode (verbose) enabled")}},this._sendConversion=function(){if(this._has_error)return;if(!this.trans.length){this._throw_error("Missing transaction data");return}if(!this.items.length){this._throw_error("Missing item data");return}_pullLocalStorage();this._fixItems();if(this._has_error!==true){var content=this._serialize({trans:this.trans,items:this.items,customer:this.customer,aid:localStorage.rfsn_aid,
cs:localStorage.rfsn_cs,ci:localStorage.rfsn_ci,src:localStorage.rfsn_src,tm:this._test_mode});rfsnLoadScript("https://www.refersion.com/tracker/v3/conversion/pub_cf23d74249251f6d1f4b.js"+content,function(){});this._throw_log("Conversion sent")}this.trans=[],this.items=[],this.customer=[]},this._fixItems=function(){var newset=[];var icheck=[];for(i=0;this.items.length>i;i++){var key=this.items[i][0]+this.items[i][2];var loc=icheck.indexOf(key);if(loc<0){icheck.push(key);newset.push(this.items[i])}else newset[loc][1]=parseInt(newset[loc][1])+
parseInt(this.items[i][1])}this.items=newset},this._serialize=function(obj){var str=[];for(var p in obj)if(!obj.hasOwnProperty(p)||typeof obj[p]=="undefined"||!obj[p].length)str.push(encodeURIComponent(p)+"=");else if(typeof obj[p]==="string")str.push(encodeURIComponent(p)+"="+encodeURIComponent(obj[p]));else str.push(encodeURIComponent(p)+"="+encodeURIComponent(JSON.stringify(obj[p])));return str.length?"?v="+Math.floor(Math.random()*1E5)+"&"+str.join("&"):""},this._throw_error=function(message){this._has_error=
true;console.error("Refersion ERROR: "+message)},this._throw_log=function(message){if(this._test_mode)console.log("Refersion LOG: "+message)},this._setSource=function(source){_pullLocalStorage();if(["SHOPIFY","CHARGEBEE","WOOCOMMERCE","MAGENTO","BREWCRATE","SNAPKNOT","RECURHUB","RFSN_JS_V3","BIGCOMMERCE","RECHARGE","PAYWHIRL","STRIPE","SALESFORCE","AMAZON"].indexOf(source.toUpperCase())===-1)source="RFSN_JS_V3";localStorage.setItem("rfsn_src",source);_pushLocalStorage()};this._initTracking()};window._rfsn=new r_tracker;window._rfsn_ready=true;