function TagApi(){
	var endpointURL="";
	
	var bufferToBase64=function (buf) {
		var binstr = Array.prototype.map.call(buf, function (ch) {
			return String.fromCharCode(ch);
		}).join('');
		return btoa(binstr);
	}
	
	var base64ToArrayBuffer=function(base64) {
	    var binary_string =  window.atob(base64);
	    var len = binary_string.length;
	    var bytes = new Uint8Array( len );
	    for (var i = 0; i < len; i++)        {
	        bytes[i] = binary_string.charCodeAt(i);
	    }
	    return bytes;
	}
	
	var getPagesInRange=function(first,last){
		var str="";
		for(var i=first;i<last;i+=1){
			if( str.length>0){
				str+=","
			}
			str+=i;
		}
		return str;
	}
	
	this.url=function(value){
		if(value){
			endpointURL=value;
		}else{
			return endpointURL;
		}
	}
	
	this.readPages=function(startIndex,endPageIndex,callback,errorCallback){
		$.ajax({url:endpointURL+"/tag?page="+getPagesInRange(startIndex,endPageIndex),type:"GET"}).done(function(response){
		
			callback(base64ToArrayBuffer(response.data));
		}).fail(function(r,b,httpStatus){
			if(r.responseJSON && r.responseJSON.StatusMessage){
				errorCallback("agent returned error "+r.responseJSON.StatusMessage)
			}else{
				errorCallback(b);
			}
		});
	}
	
	this.writePages=function(tagPages,data,callback,errorCallback){
		var req={
			data:bufferToBase64(data)
		};
		
		$.ajax({
			url:endpointURL+"/tag?page="+tagPages,
			type:"POST",data:JSON.stringify(req),
			contentType: "application/json"
			}).done(
		function(response){
			callback(response);
		})
		.fail(
		function(r,b,httpStatus){
			if(r.responseJSON && r.responseJSON.StatusMessage){
				errorCallback("agent returned error "+r.responseJSON.StatusMessage)
			}else{
				errorCallback(httpStatus);
			}
		});
	}
}
