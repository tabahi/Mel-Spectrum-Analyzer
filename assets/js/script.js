// Hacks to deal with different function names in different browsers
window.requestAnimFrame = (function(){
return  window.requestAnimationFrame       ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        function(callback, element){
            window.setTimeout(callback, 1000);
        };
})();

window.AudioContext = (function(){
    return  window.webkitAudioContext || window.AudioContext || window.mozAudioContext;
})();


// Global Variables for Audio

let sourceNode;
let workletNode;
let audioData = null;
let audioPlaying = false;

let audioUrl = "Haendel_Lascia_chi_o_pianga.mp4";   //url https://www.youtube.com/watch?v=kznhSUTR0JA
let current_playing = "Haendel's Lascia ch'io pianga, soprano Tullia Pedersoli - LIVE";
// This must be hosted on the same server as this page, otherwise Cross Site Scripting error

var SPEC_BOX_WIDTH = 1024
var SPEC_BOX_HEIGHT = 400
let SpectrumCanvasCtx;

SpectrumCanvasCtx = document.querySelector('#SpectrumCanvas').getContext('2d');
SourceMode = 0;
PlayMode = 0;

var settings = {spec_type: 1, plot_type: 1, plot_len: 90, color_scheme: 1, f_min: 50, f_max: 4000, N_fft_bins: 128, N_mel_bins: 64, window_width: 40, window_step: 25, amplitude_log:false, freq_log:false, pre_norm_gain: 1000, pre_norm_silence_ceil: 1000, norm_max: 100000, local_norm_length:20, high_f_emph:10, skip_rate:-1};

var bin_Hz = [];
var skl = 3;

document.querySelector('#mic_button').addEventListener('click', function() 
{
    
    if(audioPlaying) stop_playing();
    mic_play();
    
});

document.querySelector('#soprano_button').addEventListener('click', function(e)
{
    if(audioPlaying) stop_playing();
    current_playing = "Haendel's Lascia ch'io pianga, soprano Tullia Pedersoli - LIVE";
    if(SourceMode==0) online_play();
    else if(SourceMode==1) offline_play();
    e.preventDefault();
});



document.querySelector('#stop_button').addEventListener('click', function(e) {
    e.preventDefault();
    stop_playing();
});



function online_play()
{
    if(audioPlaying) return;

    let audioContext;
    try
    {
        audioContext = new AudioContext();
    }
    catch (e)
    {
        alert('Web Audio API is not supported in this browser');
    }
    
    sourceNode = audioContext.createBufferSource();

    let loadSound = new Promise(function(resolve, reject) 
            {
                try
                {
                    document.getElementById('msg').textContent = "Loading audio...";
                    let request = new XMLHttpRequest();
                    request.open('GET', audioUrl, true);
                    request.responseType = 'arraybuffer';
                    // When loaded, decode the data and play the sound
                    request.onload = function ()
                    {
                        audioContext.decodeAudioData(request.response, function (buffer)
                        {
                            document.getElementById('msg').textContent = "Audio sample download finished";
                            audioData = buffer;
                            resolve("finished")
                        }, onError);
                    }
                    request.send();
                }
                catch (e) {  reject(new Error("Error: unable to download the media file.")); }
                
            });
            

    audioContext.audioWorklet.addModule('assets/js/analyzernode.js').then(function() {

        workletNode = new AudioWorkletNode(audioContext, 'spectrum-processor');
        workletNode.port.onmessage = (e) => workletMsgRx(e.data);

        workletNode.port.postMessage(settings);
        

        sourceNode.onended = function()
        {
            workletNode.port.postMessage(22);   //send 22 to end the process
            audioPlaying = false;
            try{ sourceNode.stop(0); } catch(e){}
            try{ workletNode.disconnect(audioContext.destination); } catch(e){}
            try{ sourceNode.disconnect(workletNode); } catch(e){}
            try{ sourceNode.disconnect(audioContext.destination); } catch(e){}

            document.getElementById('msg').textContent = "Playing finished";
            console.log("End")
        }

        loadSound.then(function() {
            
            document.getElementById('msg').textContent = "Playing " + current_playing;
            sourceNode.buffer = audioData;
            sourceNode.connect(audioContext.destination);
            sourceNode.connect(workletNode);
            workletNode.connect(audioContext.destination);
            sourceNode.loop = false;
            PlayMode = 1;
            sourceNode.start(0);
            audioPlaying = true;

        }).catch(function(err) {
            console.log('File loading failed: ' + err);
        });
        
    }).catch(function(err) {
        console.log('AudioWorklet loading failed: ' + err);
    });
}


function dnd_play(dnd_file)
{
    if(audioPlaying) return;

    let DnDaudioContext;
    try
    {
        DnDaudioContext = new AudioContext();
    }
    catch (e)
    {
        alert('Web Audio API is not supported in this browser');
    }
    
    sourceNode = DnDaudioContext.createBufferSource();
    DnDaudioContext.audioWorklet.addModule('assets/js/analyzernode.js').then(function() {

        workletNode = new AudioWorkletNode(DnDaudioContext, 'spectrum-processor');
        workletNode.port.onmessage = (e) => workletMsgRx(e.data);
    
        workletNode.port.postMessage(settings);

        // When the buffer source stops playing, disconnect everything
        sourceNode.onended = function()
        {
            workletNode.port.postMessage(22);   //send 22 to end the process
            audioPlaying = false;

            try{ sourceNode.stop(0); } catch(e){}
            try{ workletNode.disconnect(audioContext.destination); } catch(e){}
            try{ sourceNode.disconnect(workletNode); } catch(e){}
            try{ sourceNode.disconnect(DnDaudioContext.destination); } catch(e){}
            try{ workletNode.disconnect(DnDaudioContext.destination); } catch(e){}
            
            document.getElementById('msg').textContent = "Playing finished";
            console.log("End")
        }

        if(dnd_file)
        {
            try
            {    
                
                document.getElementById('msg').textContent = "Loading audio...";
                DnDaudioContext.decodeAudioData(dnd_file, function (buffer)
                {
                    audioData = buffer;
                    document.getElementById('msg').textContent = "Playing " + current_playing;
                    sourceNode.buffer = audioData;
                    sourceNode.connect(DnDaudioContext.destination);
                    sourceNode.connect(workletNode);
                    workletNode.connect(DnDaudioContext.destination);
                    sourceNode.loop = false;
                    PlayMode = 2;
                    sourceNode.start(0);    // Play the sound now
                    audioPlaying = true;

                }, onError);

            }
            catch (err)
                {
                console.log('File loading failed: ' + err);
                }
        }
        else
        console.log("Empty or no file");
        
    }).catch(function(err) {
        console.log('AudioWorklet loading failed: ' + err);
    });
}


function mic_play()
{
    if(audioPlaying) return;

    let micAudioContext;
    try
    {
        micAudioContext = new AudioContext();
    }
    catch (e)
    {
        alert('Web Audio API is not supported in this browser');
    }
    
    //sourceNode = micAudioContext.createBufferSource();
    micAudioContext.audioWorklet.addModule('assets/js/analyzernode.js').then(function() {

        workletNode = new AudioWorkletNode(micAudioContext, 'spectrum-processor');
        workletNode.port.onmessage = (e) => workletMsgRx(e.data);

        workletNode.port.postMessage(settings);
        
        document.getElementById('msg').textContent = "Connecting mic...";

        createMicSrcFrom(micAudioContext).then((status) => {
            
            //sourceNode.connect(micAudioContext.destination);
            sourceNode.connect(workletNode);
            workletNode.connect(micAudioContext.destination);
            PlayMode = 3;
            audioPlaying = true;
            document.getElementById('msg').textContent = "Streaming from mic";
        }).catch((err)=>{
            console.log(err);
        })
        
        
    }).catch(function(err) {
        console.log('AudioWorklet loading failed: ' + err);
    });
}



function offline_play()
{
    if(audioPlaying) return;

    let offAudioContext;
    try
    {
        offAudioContext = new OfflineAudioContext(1,44100*400,44100);
    }
    catch (e)
    {
        alert('Web Audio API is not supported in this browser');
    }
    
    sourceNode = offAudioContext.createBufferSource();


    let loadSound = new Promise(function(resolve, reject) 
            {
                try
                {
                    document.getElementById('msg').textContent = "Loading audio...";
                    let request = new XMLHttpRequest();
                    request.open('GET', audioUrl, true);
                    request.responseType = 'arraybuffer';
                    // When loaded, decode the data and play the sound
                    request.onload = function ()
                    {
                        offAudioContext.decodeAudioData(request.response, function (buffer)
                        {
                            document.getElementById('msg').textContent = "Audio sample download finished";
                            audioData = buffer;
                            resolve("finished")
                        }, onError);
                    }
                    request.send();
                }
                catch (e) {  reject(new Error("Error: unable to download the media file.")); }
                
            });

            

    offAudioContext.audioWorklet.addModule('assets/js/analyzernode.js').then(function() {
        workletNode = new AudioWorkletNode(offAudioContext, 'spectrum-processor');

        workletNode.port.onmessage = (e) => workletMsgRx(e.data);

        workletNode.port.postMessage(settings);

        sourceNode.onended = function()
        {
            workletNode.port.postMessage(22);   //send 22 to end the process
            audioPlaying = false;
            sourceNode.stop(0);
            try{ workletNode.disconnect(offAudioContext.destination); } catch(e) {}
            try{ sourceNode.disconnect(workletNode); } catch(e) {}
            try{ sourceNode.disconnect(offAudioContext.destination); } catch(e) {}
            console.log("End");
        }

       
        loadSound.then(function() {
            
            document.getElementById('msg').textContent = "Rendering...";
            sourceNode.buffer = audioData;
            sourceNode.connect(offAudioContext.destination);
            sourceNode.connect(workletNode);
            workletNode.connect(offAudioContext.destination);
            sourceNode.loop = false;
            PlayMode = 4;
            sourceNode.start(0);    // Play the sound now
            audioPlaying = true;

            offAudioContext.startRendering().then(function(renderedBuffer) {
                console.log('Rendering completed successfully');
                document.getElementById('msg').textContent = "Rendering finished";
                let offsource = offAudioContext.createBufferSource();
                offsource.buffer = renderedBuffer;
                offsource.start(0);
                
            }).catch(function(err) {
                console.log('Rendering failed: ' + err);
                document.getElementById('msg').textContent = "Rendering failed";
                // Note: The promise should reject when startRendering is called a second time on an OfflineAudioContext
            });

        }).catch(function(err) {
            console.log('File loading failed: ' + err);
        });
    
    }).catch(function(err) {
        console.log('AudioWorklet loading failed: ' + err);
    });
}




function createMicSrcFrom(audioCtx)
{
    return new Promise((resolve, reject)=>{
        let constraints = {audio:true, video:false}

        navigator.mediaDevices.getUserMedia(constraints)
        .then((stream)=>{
            sourceNode = audioCtx.createMediaStreamSource(stream)
            resolve("sourced")
        }).catch((err)=>{reject(err)})
    })
}

function stop_playing()
{
    
    workletNode.port.postMessage(22);   //send 22 to end the process
    if(PlayMode==1)     //Online play
    {
        try{ sourceNode.stop(0); } catch(e){ }
        try{ sourceNode.disconnect(workletNode); } catch(e){ }
    }
    else if(PlayMode==2)    //Dnd play
    {
        try{ sourceNode.stop(0); } catch(e){ }
        try{ sourceNode.disconnect(workletNode); } catch(e){ }
    }
    else if(PlayMode==3)    //mic play
    {
        //sourceNode.stop(0);
        try{ sourceNode.disconnect(workletNode); } catch(e){ }
    }
    else if(PlayMode==4)    //offline play
    {
        try{ sourceNode.stop(0); } catch(e){ }
        try{ sourceNode.disconnect(workletNode); } catch(e){ }
    }
    audioPlaying = false;
    
    document.getElementById('msg').textContent = "Stopped";
    console.log("Stopped")
}

function onError(e)
{
    console.log(e);
    document.getElementById('msg').textContent = "Error";
}



let band_amps;
var segments_in = 0;
var segments_done  = 0;

spectrum_history = [];
var spec_bands;
var plot_skip = 0;


function workletMsgRx(msg)
{
    
    if(Number.isInteger(msg))
    {
        segments_in += msg;
        if ((segments_in > segments_done))
        {
            workletNode.port.postMessage(1);
        }
    }
    else if (Array.isArray(msg)) 
    {   
        if(plot_skip==1)
        {
            //console.log(msg);
            band_amps = msg;
            if(spec_bands != band_amps.length)
            {
                console.log("Bins N mismatch");
                console.log(String(band_amps.length) + ", " + String(spec_bands));
            }

            if(settings.plot_type==2)
            {
                drawBandsVisual = requestAnimFrame(plotBands);
            }
            else
            {
                spectrum_history.push (band_amps);
                if(spectrum_history.length > settings.plot_len)
                    spectrum_history.splice(0,1);
                drawSpecVisual = requestAnimFrame(plot_spectrum);
            }

            segments_done++;
        }
        else if(plot_skip > 0)
        {
            plot_skip = 0;
        }
        plot_skip++;
    }
    else if(msg.bins_Hz)
    {
        //console.log(msg.bins_Hz);
        bin_Hz = msg.bins_Hz;
        spec_bands = bin_Hz.length;
        skl = Math.round(spec_bands/32);
        //spectrum_history = [];
    }
    else
    {
        console.log("Unrecognized Rx on the main process port");
        console.log(msg);
    }
    
}





function clearSpectrumCanvas() {
    SpectrumCanvasCtx.clearRect(0, 0, SPEC_BOX_WIDTH, SPEC_BOX_HEIGHT);
}

function plotBands()
{
    clearSpectrumCanvas();
    SpectrumCanvasCtx.fillStyle = 'rgb(0, 0, 0)';
    SpectrumCanvasCtx.fillRect(0, 0, SPEC_BOX_WIDTH, SPEC_BOX_HEIGHT);

    var barWidth = (SPEC_BOX_WIDTH / spec_bands);
    var barHeight;
    var x = 0;

    /*
    var max_bin_value = 0;
    var max_bin = 0;*/

    for(var i = 0; i < spec_bands; i++)
    {
        clr = band_amps[i]/settings.norm_max;
        
        let R = 255 * clr;
        let G = 50;
        let B = 50;
        barHeight = SPEC_BOX_HEIGHT*band_amps[i]/settings.norm_max;
        SpectrumCanvasCtx.fillStyle = 'rgb(' + (R) + ',' + (G) + ',' + (B) + ')';
        SpectrumCanvasCtx.fillRect(x,SPEC_BOX_HEIGHT-barHeight,barWidth,barHeight);

        x += barWidth;
        
        /*
        if(band_amps[i] > max_bin_value)
        {
        max_bin_value = band_amps[i];
        max_bin = i;
        }*/
    }
    //console.log(String(max_bin), " / ", String(spec_bands));
    
    if(bin_Hz.length>0)
    {   
        x = 0;
        SpectrumCanvasCtx.font = "12px serif";
        SpectrumCanvasCtx.fillStyle = "white";
        SpectrumCanvasCtx.textAlign = "right";
        SpectrumCanvasCtx.fillText("Hz", SPEC_BOX_WIDTH/2, 30); 
        for(let j = 0; j < spec_bands; j++ ) 
        {
            if((j%skl)==0)
            {
                SpectrumCanvasCtx.fillText(bin_Hz[j], x, 10); 
            }
            x += barWidth;
        }
    }
    
}

function plot_spectrum() 
{
    clearSpectrumCanvas();
    SpectrumCanvasCtx.fillStyle = 'rgb(0, 0, 0)';
    SpectrumCanvasCtx.fillRect(0, 0, SPEC_BOX_WIDTH, SPEC_BOX_HEIGHT);
    point_width = SPEC_BOX_WIDTH/settings.plot_len;
    point_height = SPEC_BOX_HEIGHT/spec_bands;

    for(let i = 0; i < spectrum_history.length; i++ ) 
    {
        for(let j = 0; j < spec_bands; j++ ) 
        {
            let clr = spectrum_history[i][j] / settings.norm_max;

            let R = 255 * clr;
            let G = 100 * clr;
            let B = 50 * clr;
            if(settings.amplitude_log)
            {
                if(clr > 0.9)
                {
                    R = 50 * clr;
                    G = 255 * clr;
                    B = 510 * clr;
                }
                else if(clr > 0.8)
                {
                    R = 255 * clr;
                    G = 255 * clr;
                    B = 125 * clr;
                }
                else if(clr > 0.7)
                {
                    R = 255 * clr;
                    G = 255 * clr;
                    B = 255 * clr;
                }
                else if(clr > 0.5)
                {
                    R = 255 * clr;
                    G = 200 * clr;
                    B = 125 * clr;
                }
            }
            else
            {
                if(clr < 0.1)
                {
                    R = 255 * clr * 10;
                    G = 10 * clr * 10;
                    B = 0 * clr * 10;
                }
                else if(clr < 0.2)
                {
                    R = 255 * clr * 10;
                    G = 100 * clr * 10;
                    B = 10 * clr * 10;
                }
                else if(clr < 0.5)
                {
                    R = 255 * clr * 10;
                    G = 125 * clr * 10;
                    B = 50 * clr * 10;
                }
                else
                {
                    R = 50 * clr;
                    G = 255 * clr;
                    B = 255;
                }
            }

            if ( spectrum_history [i] [j] > 0 )
            {
                SpectrumCanvasCtx.fillStyle = 'rgb(' + (R) + ',' + (G) + ',' + (B) + ')';
            }
            else
            SpectrumCanvasCtx.fillStyle = 'rgb(0,0,0)';
            SpectrumCanvasCtx.fillRect(i * point_width, (spec_bands -j - 1) * point_height, point_width, point_height); 
        }
    }
    if(bin_Hz.length>0)
    {
        
        SpectrumCanvasCtx.font = "12px serif";
        SpectrumCanvasCtx.fillStyle = "white";
        SpectrumCanvasCtx.textAlign = "right";
        SpectrumCanvasCtx.fillText("Hz", SPEC_BOX_WIDTH - 45, 15); 
        for(let j = 0; j < spec_bands; j++ ) 
        {
            if((j%skl)==0)
            {
                SpectrumCanvasCtx.fillText(bin_Hz[j] + "-", SPEC_BOX_WIDTH - 10, ((spec_bands -j - 1) * point_height)  + 5); 
            }
        }
    }

}


// Check for the various File API support.
if (window.File && window.FileReader && window.FileList && window.Blob) {
    // Great success! All the File APIs are supported.
  } else {
    console.log('The Drag and Drop File APIs are not fully supported in this browser.');
  }


var handleDragOver = function(e) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
}


var handleDrop = function(e) {
    e.preventDefault()
    e.stopPropagation()

    var files = e.dataTransfer.files
    readmultifiles(files) ;
}


function readmultifiles(files) 
{
    var reader = new FileReader();  
    function readFile(index) 
    {
      if( index >= files.length )
      {           
        //document.getElementById("filesx").value = "";
        return;
      }
    
      var file = files[index];
      var name = file.name;
      var mimeType= file.type;
      reader.onload = function(e) 
      {
        if(mimeType.includes("audio/") || mimeType.includes("video/"))
        {
            var ul = document.querySelector("#bag>ul");
            var li = document.createElement("li");
            //li.innerHTML = name;
            //ul.appendChild(li);
            var bin = e.target.result;
            // do sth with bin
            if (audioPlaying) stop_playing();
            current_playing = name;
            dnd_play(bin);
        }
        
        //readFile(index+1)
      }
      reader.readAsArrayBuffer(file);
    }
    readFile(0);
}


function update_settings()
{

    settings.spec_type = parseInt(document.getElementById("spec_type").value);
    settings.plot_type = parseInt(document.getElementById("plot_type").value);
    settings.plot_len = parseInt(document.getElementById("plot_len").value);
    settings.color_scheme = parseInt(document.getElementById("color_scheme").value);
    settings.f_min = parseInt(document.getElementById("f_min").value);
    settings.f_max = parseInt(document.getElementById("f_max").value);

    settings.N_fft_bins = parseInt(document.getElementById("N_fft_bins").value);
    settings.N_mel_bins = parseInt(document.getElementById("N_mel_bins").value);
    settings.window_width = parseInt(document.getElementById("window_width").value);
    settings.window_step = parseInt(document.getElementById("window_step").value);
    settings.pre_norm_gain = parseInt(document.getElementById("pre_norm_gain").value);
    settings.pre_norm_silence_ceil = parseInt(document.getElementById("pre_norm_silence_ceil").value);
    settings.norm_max = parseInt(document.getElementById("norm_max").value);
    settings.local_norm_length = parseInt(document.getElementById("local_norm_length").value);
    settings.high_f_emph = parseInt(document.getElementById("high_f_emph").value);
    settings.skip_rate = parseInt(document.getElementById("skip_rate").value);

    settings.amplitude_log = document.getElementById("amplitude_log").checked;
    settings.freq_log = document.getElementById("freq_log").checked;

    document.getElementById('id01').style.display='none';
    
    
    console.log(settings);

    if(audioPlaying)
    workletNode.port.postMessage(settings);
}

function dom_settings()
{

    document.getElementById("spec_type").value = settings.spec_type;
    document.getElementById("plot_type").value = settings.plot_type;
    document.getElementById("plot_len").value = settings.plot_len;
    document.getElementById("color_scheme").value = settings.color_scheme;
    document.getElementById("f_min").value = settings.f_min;
    document.getElementById("f_max").value = settings.f_max;

    document.getElementById("N_fft_bins").value = settings.N_fft_bins;
    document.getElementById("N_mel_bins").value = settings.N_mel_bins;
    document.getElementById("window_width").value = settings.window_width;
    document.getElementById("window_step").value = settings.window_step;
    document.getElementById("pre_norm_gain").value = settings.pre_norm_gain;
    document.getElementById("pre_norm_silence_ceil").value = settings.pre_norm_silence_ceil;
    document.getElementById("norm_max").value = settings.norm_max;
    document.getElementById("local_norm_length").value = settings.local_norm_length;
    document.getElementById("high_f_emph").value = settings.high_f_emph;
    document.getElementById("skip_rate").value = settings.skip_rate;

    document.getElementById("amplitude_log").checked = settings.amplitude_log;
    document.getElementById("freq_log").checked = settings.freq_log;

}

function setup()
{
    
    dom_settings();
    clearSpectrumCanvas();
    
    SpectrumCanvasCtx.fillStyle = 'rgb(10, 10, 20)';
    SpectrumCanvasCtx.fillRect(0, 0, SPEC_BOX_WIDTH, SPEC_BOX_HEIGHT);

    SpectrumCanvasCtx.font = "30px Trebuchet MS";
    SpectrumCanvasCtx.fillStyle = "gray";
    SpectrumCanvasCtx.textAlign = "center";
    SpectrumCanvasCtx.fillText("^_^", 500, 100); 

    
    var dropzone = document.getElementById('dropZone');
    dropzone.addEventListener('drop', handleDrop, false)
    dropzone.addEventListener('dragover', handleDragOver, false)
    console.log("Ready");
}




window.onload = setup;
/*


function drawTimeDomain()
{
    //clearBandsCanvas();
    requestAnimFrame(drawTimeDomain);
    //drawVisual = requestAnimationFrame(drawTimeDomain);
    canvas_width_ratio = BandsBoxWidth/fftBinCount;
    for (let i = 0; i < fftBinCount; i++)
    {
        let value = amplitudeArray[i] / 256;
        let y = BandsBoxHeight - (BandsBoxHeight * value) - 1;
        SpectrumCanvasCtx.fillStyle = '#ffffff';
        SpectrumCanvasCtx.fillRect(i*canvas_width_ratio, y, 1, 1);
    }
}

window.addEventListener('load', function() {
})
*/


