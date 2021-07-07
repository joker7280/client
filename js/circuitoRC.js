// SERVER LAB
const serverAddress = 'https://virtualab.unimarconi.it:8000';

// USER MARCONI
const username = 'Prova'

// VARIABILE FREQUENZA DI AGGIORNAMENTO INTERFACCIA
const tempo = 500; // millisecondi


// INIT GRAFICO ESPERIMENTO
datiCorrenteAlimentatore = [];
datiCorrenteCarico = [];
datiCorrente = [];
datiTensione = [];
ascissa = [];
t = 0;
var updateArrays;
var lineChartData;
var lineChartData2;

// ********* INIT GRAFICI REAL TIME *************
// GRAFICO REAL TIME TENSIONE
dati_tensione = [];
// GRAFICO REAL TIME CORRENTE ALIMENTATORE
dati_corrente_A = [];
// GRAFICO REAL TIME CORRENTE CARICO
dati_corrente_C = [];

// INIT VALUES CARICO
var minOhm = 0;
var currOhm;
var maxOhm = 4000;
var minVolt_C = 0.0;
var currVolt_C = 5.5;
var maxVolt_C = 16.0;
var minWatt = 0;
var currWatt;
var maxWatt = 150;
var minAmpere_C = 0.0;
var currAmpere_C;
var maxAmpere_C = 3.0;

// INIT VALUES ALIMENTATORE
var minVolt_A = 0.0;
var currVolt_A = 0.0;
var maxVolt_A = 13;
var minAmpere_A = 0.0;
var currAmpere_A;
var maxAmpere_A = 5.0;

// INIT TEST OBJECT
var riepilogoTest;

// INIT TIMER ONLY OUTPUT
var timer = new Timer();
timer.addEventListener('secondsUpdated', function (e) {
    jQuery('.basicUsage').html(timer.getTimeValues().toString());
});

// TOGGLE WEBCAM
jQuery('#btn-webcam').click(function() {
      jQuery('.cam').toggle();
});

// ********************** INIZIO SOCKET.io **********************
jQuery(function () {

    // **************** CONNESSIONE CON WEBSOCKET SERVER ***********
    const socket = io(serverAddress, {secure: true});

    // INVIO USERNAME
    socket.emit('username', username);

    // UPDATE NUMERO UTENTI
    socket.on('connectedClients', function(connectedClients){
        jQuery('#connectedClients').text(connectedClients);
    });

    // VIDEO 1
    socket.on('image', (image) => {
        const imageElm = document.getElementById('image');
        imageElm.src = 'data:image/jpeg;base64, '+image;
    });

    // VIDEO 2
    socket.on('image2', (image) => {
        const imageElm2 = document.getElementById('image2');
        imageElm2.src = 'data:image/jpeg;base64, '+image;
    });

    // MESSAGGIO IN CHAT
    socket.on('chat message', function(msg){
        jQuery('#messages').append(jQuery('<div>').html(msg));
        jQuery(".direct-chat").stop().animate({ scrollTop: jQuery(".direct-chat")[0].scrollHeight}, 1000);
    });

    socket.on('is_online', function(username){
        jQuery('#messages').append(jQuery('<div>').html(username));
        // jQuery(".direct-chat").stop().animate({ scrollTop: jQuery(".direct-chat")[0].scrollHeight}, 1000);
    });

    // UPDATE TENSIONE CARICO/CONDENSATORE
    socket.on('updateCarico', function(data){
        if(data.includes('V')){
            var i = data.indexOf('V');
            data = data.substring(0, i);
            jQuery('.tensioneCondensatore').text(data+" V");
            //jQuery('#tabella-carico-tensione').text(data+" V"); // SCRIVO CAMPO IN TABELLA
            data = parseFloat(data);
            dati_tensione.push(data);
            currVolt_C = data; // tensione condensatore
        }
    });

    // UPDATE CORRENTE SCARICA (carico elettronico)
    socket.on('updateCarico', function(data){
        if(data.includes('A')){
            var i = data.indexOf(',');
            var j = data.indexOf('A');
            data = data.substring(i+1, j);
            jQuery('.correnteScarica').text(data+" A");
            if(riepilogoTest) {
                if (riepilogoTest.test == 'Scarica') jQuery('.correnteAttuale').text(data+" A");
            }
            currWatt = currVolt_C * data;
            currWatt = currWatt.toFixed(3); // 3 decimali per assorbimento
            //jQuery('#tabella-carico-assorbimento').text(currWatt+" W"); // SCRIVO CAMPO IN TABELLA
            //jQuery('#tabella-carico-corrente').text(data+" A"); // SCRIVO CAMPO IN TABELLA
            data = parseFloat(data);
            dati_corrente_C.push(data);
        }
    });

    // UPDATE CORRENTE CARICA (alimentatore)
    socket.on('updateAlimentatore', function(data){
        if(data.includes('A')){
            var i = data.indexOf('A');
            data = data.substring(i-4, i)+"0";
            jQuery('.correnteCarica').text(data+" A");
            if (riepilogoTest) {
                if (riepilogoTest.test == 'Carica') jQuery('.correnteAttuale').text(data+" A");
            }
            currWatt_A = currVolt_A*data; // W = V*I
            currWatt_A = currWatt_A.toFixed(3); // 3 decimali al massimo
            //jQuery('#tabella-alimentatore-assorbimento').text(currWatt_A+" W");
            data = parseFloat(data);
            dati_corrente_A.push(data);
        }
    });



    // BOTTONI
    jQuery('#btn-reset').click(function(e){
        e.preventDefault();
        jQuery('.alert').hide(1000);
        jQuery('#status').text('Aperto');
        jQuery('#btn-reset').addClass('light')
        socket.emit('newTest', 'new');
    });

    jQuery('#btn-choose-test').click(function(e){
        e.preventDefault();
        jQuery('#status').text('Aperto');
        jQuery('#btn-reset').addClass('light')
        socket.emit('newTest', 'new');
        socket.emit('setTest', jQuery("input[name='chooseTest']:checked").val());        
        jQuery('#step1').hide();
        if(jQuery("input[name='chooseTest']:checked").val()=='carica'){
            riepilogoTest = {
                test: "Carica"
            }
            jQuery('#step2').show();
        } else {
            riepilogoTest = {
                test: "Scarica"
            }
            jQuery('#step5').show();
        }
    });

    jQuery('#btn-carica-ampere-next').click(function(){
        socket.emit('setAmpere', jQuery('#caricaAmpereOutputId').val()); 
        riepilogoTest.corrente = jQuery("#caricaAmpereOutputId").val();
        jQuery('#step2').hide();
        jQuery('#step3').show();
    });

    jQuery('#btn-carica-ampere-back').click(function(){
        delete riepilogoTest.test;
        jQuery('#step2').hide();
        jQuery('#step1').show();
    });

    jQuery('#btn-carica-volt-next').click(function(){
        if(jQuery('#caricaVoltOutputId').val() < currVolt_C){
            alert("Si prega di inserire durante la carica un valore superiore alla tensione attuale del condensatore");
            return false;
        }
        socket.emit('setVolt', jQuery('#caricaVoltOutputId').val());
        riepilogoTest.tensione = jQuery("#caricaVoltOutputId").val();
        jQuery('#step3').hide();
        jQuery('#step4').show();
    });

    jQuery('#btn-carica-volt-back').click(function(){
        delete riepilogoTest.corrente;
        jQuery('#step3').hide();
        jQuery('#step2').show();
    });

    jQuery('#btn-carica-ohm-next').click(function(){
        socket.emit('setOhm_C', jQuery('#caricaOhmOutputId').val());
        riepilogoTest.resistenza = jQuery("#caricaOhmOutputId").val();
        jQuery('#step4').hide();
        document.getElementById("riepilogoTest").innerHTML = "<p>Tipo di test: <span>" + riepilogoTest.test + "</span></p><p>Corrente: <span>" + riepilogoTest.corrente + " Ampere</span></p><p>Tensione: <span>" + riepilogoTest.tensione + " Volt</span></p><p>Resistenza: <span>" + riepilogoTest.resistenza + " Ohm</span></p>";
        jQuery('#step8').show();
    });

    jQuery('#btn-carica-ohm-back').click(function(){
        delete riepilogoTest.tensione;
        jQuery('#step4').hide();
        jQuery('#step3').show();
    });

    jQuery('#btn-scarica-mode-next').click(function(){
        jQuery('#step5').hide();
        socket.emit('setMode_C', jQuery("input[name='chooseMode']:checked").val());
        if(jQuery("input[name='chooseMode']:checked").val()=='CC'){
            riepilogoTest.modalita = "Corrente costante";
            jQuery('#step6').show();
        } else {
            riepilogoTest.modalita = "Potenza costante";
            jQuery('#step7').show();
        }
    });

    jQuery('#btn-scarica-mode-back').click(function(){
        delete riepilogoTest.test;
        jQuery('#step5').hide();
        jQuery('#step1').show();
    });

    jQuery('#btn-scarica-ampere-next').click(function(){
        socket.emit('setAmpere_C', jQuery('#scaricaAmpereOutputId').val());
        riepilogoTest.corrente = jQuery('#scaricaAmpereOutputId').val();
        jQuery('#step6').hide();
        document.getElementById("riepilogoTest").innerHTML = "<p>Tipo di test: <span>" + riepilogoTest.test + "</span></p><p>Modalità: <span>" + riepilogoTest.modalita + "</span></p><p>Corrente: <span>" + riepilogoTest.corrente + " Ampere</span></p>";
        jQuery('#step8').show();
    });

    jQuery('#btn-scarica-ampere-back').click(function(){
        delete riepilogoTest.modalita;
        jQuery('#step6').hide();
        jQuery('#step5').show();
    });

    jQuery('#btn-scarica-watt-next').click(function(){
        socket.emit('setWatt_C', jQuery('#scaricaWattOutputId').val());
        riepilogoTest.assorbimento = jQuery('#scaricaWattOutputId').val();
        jQuery('#step7').hide();
        document.getElementById("riepilogoTest").innerHTML = "<p>Tipo di test: <span>" + riepilogoTest.test + "</span></p><p>Modalità: <span>" + riepilogoTest.modalita + "</span></p><p>Assorbimento: <span>" + riepilogoTest.assorbimento + " Watt</span></p>";
        jQuery('#step8').show();
    });

    jQuery('#btn-scarica-watt-back').click(function(){
        delete riepilogoTest.modalita;
        jQuery('#step7').hide();
        jQuery('#step5').show();
    });

    jQuery('#btn-avvia-test-back').click(function(){
        jQuery('#step8').hide();
        if(riepilogoTest.test == "Carica"){
            delete riepilogoTest.resistenza;
            jQuery('#step4').show();
        } else {
            if(riepilogoTest.assorbimento) {
                delete riepilogoTest.assorbimento;
                jQuery('#step7').show();
            } else {
                delete riepilogoTest.corrente;
                jQuery('#step6').show();
            }
        }
    });

    jQuery('#btn-avvia-test-next').click(function(e){
        e.preventDefault();
        jQuery('.alert').show(1000);
        jQuery('#status').text('Chiuso');
        jQuery('#btn-reset').removeClass('light')
        if(riepilogoTest.test == "Carica"){
            console.log("Avviato");
            socket.emit('startTest', 'carica', username);
            jQuery('#graficoScarica').hide();
            jQuery('#graficoCarica').show();
        } else {
            socket.emit('startTest', 'scarica', username);
            jQuery('#graficoCarica').hide();
            jQuery('#graficoScarica').show();
        }
        jQuery('#avviaTest').hide();
        timer.start();
        jQuery('.tensioneStart').text(currVolt_C+" V")
        jQuery('#stopTest').show();
        
        // All'avvio dell'esperimento parte il timer e si iniziano a popolare
        // gli array di output con setInterval.

        // 1) ascissa = timer (t è ascissa nel grafico finale)
        // 2) datiTensione = tensione attuale del condensatore
        // 3) datiCorrenteCarico = corrente circuito durante la scarica
        // 4) datiCorrenteAlimentatore = corrente circuito durante la carica

        updateArrays = setInterval(function(){
            datiCorrenteAlimentatore.push(dati_corrente_A[dati_corrente_A.length-1]);
            datiCorrenteCarico.push(dati_corrente_C[dati_corrente_C.length-1]);
            datiTensione.push(dati_tensione[dati_tensione.length-1]);
            ascissa.push((t++)/2);

            // LOG PER TESTING
            // console.log("Ascissa: "+ascissa);
            // console.log("DatiTensione: "+datiTensione);
            // console.log("datiCorrenteCarico: "+datiCorrenteCarico);
            // console.log("datiCorrenteAlimentatore: "+datiCorrenteAlimentatore);
        }, tempo);
    });

    jQuery('#btn-interrompi-test').click(function(e){
        e.preventDefault();
        jQuery('.alert').hide(1000);
        jQuery('#status').text('Aperto');
        jQuery('#btn-reset').addClass('light')
        socket.emit('newTest', 'new');
        timer.stop();
        var tensioneEnd = currVolt_C;
        clearInterval(updateArrays);
        jQuery('#stopTest').hide();
        jQuery('#outputTest').show();
        jQuery('.tensioneEnd').text(currVolt_C+" V");
    });

    jQuery('#btn-avvia-nuovo-test').click(function(e){
        e.preventDefault();
        jQuery('.alert').hide(1000);
        jQuery('#status').text('Aperto');
        jQuery('#btn-reset').addClass('light')
        socket.emit('newTest', 'new');
        jQuery('.basicUsage').html('00:00:00');
        jQuery('.tensioneEnd').empty();
        jQuery('.tensioneStart').empty();
        if(riepilogoTest.test == "Carica"){
            delete riepilogoTest.resistenza;
            delete riepilogoTest.tensione;
            delete riepilogoTest.corrente;
        }
        else {
            if(riepilogoTest.assorbimento) delete riepilogoTest.assorbimento;
            if(riepilogoTest.corrente) delete riepilogoTest.corrente;
            delete riepilogoTest.modalita;
        }
        delete riepilogoTest.test;
        jQuery('#outputTest').hide();
        jQuery('#output').hide();
        jQuery('#step8').hide();
        jQuery('#avviaTest').show();
        jQuery('#step1').show();
        // ascissa = []; // tempo in secondi. E' ascissa nel grafico finale
        // datiTensione = [];
        // datiCorrenteCarico = [];
        // datiCorrenteAlimentatore = [];
        ascissa.length = 0;
        datiTensione.length = 0;
        datiCorrenteCarico.length = 0;
        datiCorrenteAlimentatore.length = 0;
        t = 0;
        jQuery('#outputTabella tbody').empty();
    });

    jQuery('#btn-output-test').click(function(){

    });

    jQuery('#chat').submit(function(e){
        e.preventDefault(); // per non ricaricare la pagina
        socket.emit('chat message', jQuery('#m').val());
        jQuery('#m').val('');
        return false;
    });


});
// *********************** FINE SOCKET.IO ************************



// GRAFICI REAL TIME

// Tensione
function onRefreshCondensatore(chart) {
    chart.data.datasets.forEach(function(dataset) {
        dataset.data.push({
            x: Date.now(),
            y: dati_tensione[dati_tensione.length-1]
        });
    });
}
var ctx = document.getElementById('chartTensione').getContext('2d');
var chart = new Chart(ctx, {
    type: 'line',
    data: { 
        datasets: [{          
            data: [],
            label: 'Dataset 2',
            borderColor: 'rgb(128, 128, 128)',
            backgroundColor: 'rgba(128, 128, 128, 0.5)'
        }] 
    },
    options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1.5, 
        scales: { 
            xAxes: [{
            type: 'realtime',
            realtime: { onRefresh: onRefreshCondensatore, delay: 1000 }
            }],
            yAxes: [{
                display: true,
                ticks: {
                  beginAtZero:true,
                  min: minVolt_C,
                  max: 16
                }
            }], 
        },
        legend:{
            display:false
        } 
    }
});


// Corrente di Carica
function onRefreshCarica(chart) {
    chart.data.datasets.forEach(function(dataset) {
        dataset.data.push({
            x: Date.now(),
            y: dati_corrente_A[dati_corrente_A.length-1]
            
        }); 
    });
}

var ctx = document.getElementById('chartCorrenteCarica').getContext('2d');
var chart = new Chart(ctx, {
    type: 'line',
    data: { 
        datasets: [{
            data: [],
            label: 'Dataset 2',
            borderColor: 'rgb(55, 153, 117)',
            backgroundColor: 'rgba(55, 153, 117, 0.5)'
        }] 
    },
    options: { 
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1.5,
        scales: { 
            xAxes: [
                {
                type: 'realtime',
                realtime: { onRefresh: onRefreshCarica, delay: 1000 }
                }
            ],
            yAxes: [{
                type: 'linear',
                position: 'left',
                realtime: { onRefresh: onRefreshCarica, delay: 1000 },
                ticks: {
                    max: 6.0,
                    min: minAmpere_A,
                }
            }], 
        },
        legend:{
            display:false
        } 
    }
});

// Corrente di Scarica
function onRefreshScarica(chart) {
    chart.data.datasets.forEach(function(dataset) {
        dataset.data.push({
            x: Date.now(),
            y: dati_corrente_C[dati_corrente_C.length-1]
            
        }); 
    });
}

var ctx = document.getElementById('chartCorrenteScarica').getContext('2d');
var chart = new Chart(ctx, {
    type: 'line',
    data: { 
        datasets: [{
            data: [],
            label: 'Dataset 2',
            borderColor: 'rgb(55, 153, 117)',
            backgroundColor: 'rgba(55, 153, 117, 0.5)'
        }] 
    },
    options: { 
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1.5,
        scales: { 
            xAxes: [
                {
                type: 'realtime',
                realtime: { onRefresh: onRefreshScarica, delay: 1000 }
                }
            ],
            yAxes: [{
                type: 'linear',
                position: 'left',
                realtime: { onRefresh: onRefreshScarica, delay: 1000 },
                ticks: {
                    max: 6,
                    min: minAmpere_A,
                }
            }], 
        },
        legend:{
            display:false
        } 
    }
});

// *************** GRAFICO OUTPUT ******************

// INPUT GRAFICO RISULTATI PER TEST DI CARICA

lineChartData = {
    labels: ascissa,
    datasets: [{
        label: 'Corrente',
        borderColor: 'rgb(55, 153, 117)',
        backgroundColor: 'rgba(55, 153, 117, 0.3)',
        fill: true,
        data: datiCorrenteAlimentatore,
        yAxisID: 'y-axis-1',
    }, {
        label: 'Tensione',
        borderColor: 'rgb(128, 128, 128)',
        backgroundColor: 'rgba(128, 128, 128, 0.5)',
        fill: true,
        data: datiTensione,
        yAxisID: 'y-axis-2'
    }]
  };


// INPUT GRAFICO RISULTATI PER TEST DI SCARICA

lineChartData2 = {
    labels: ascissa,
    datasets: [{
        label: 'Corrente',
        borderColor: 'rgb(55, 153, 117)',
        backgroundColor: 'rgba(55, 153, 117, 0.3)',
        fill: true,
        data: datiCorrenteCarico,
        yAxisID: 'y-axis-1'
        }, {
        label: 'Tensione',
        borderColor: 'rgb(128, 128, 128)',
        backgroundColor: 'rgba(128, 128, 128, 0.5)',
        fill: true,
        data: datiTensione,
        yAxisID: 'y-axis-2'
    }],
};

jQuery('#btn-output-test').click(function(){
    jQuery('#output').show();
    jQuery('#outputGrafico').append('<canvas id="canvas"></canvas>');
    jQuery('#outputTabella tbody').empty();

    if(riepilogoTest.test=='Carica'){
        for (var i = 0; i < ascissa.length; i++) {
            jQuery('#outputTabella tbody').append('<tr><td>'+ascissa[i]+'</td><td>'+datiCorrenteAlimentatore[i]+'</td><td>'+datiTensione[i]+'</td></tr>');
        }
        ctx = document.getElementById('canvas').getContext('2d');
            window.myLine = Chart.Line(ctx, {
              data: lineChartData,
              options: {
                responsive: true,
                hoverMode: 'index',
                stacked: false,
                title: {
                  display: false,
                  text: 'Test di Carica'
                },
                scales: {
                  yAxes: [{
                    type: 'linear',
                    display: true,
                    position: 'left',
                    id: 'y-axis-1',
                    ticks: {
                        max: 6,
                        min: minAmpere_A,
                    },
                    scaleLabel: {
                      display: true,
                      fontSize: 18,
                      labelString: "AMPERE",
                      fontColor: 'rgb(55, 153, 117)',
                    }
                  }, {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    id: 'y-axis-2',
                    ticks: {
                        max: 14,
                        min: 0,
                    },
                    scaleLabel: {
                      display: true,
                      fontSize: 18,
                      labelString: "VOLT",
                      fontColor: 'rgb(128, 128, 128)',
                    },
                    gridLines: {
                      drawOnChartArea: false,
                    },
                  }],
                  xAxes: [{
                    scaleLabel: {
                      display: true,
                      fontSize: 18,
                      labelString: "SECONDI",
                      fontColor: 'rgb(26,26,26)',
                    },
                  }]
                }
              }
            });
    } else {
        for (var i = 0; i < ascissa.length; i++) {
            jQuery('#outputTabella tbody').append('<tr><td>'+ascissa[i]+'</td><td>'+datiCorrenteCarico[i]+'</td><td>'+datiTensione[i]+'</td></tr>');
        }
        ctx = document.getElementById('canvas').getContext('2d');
        window.myLine = Chart.Line(ctx, {
            data: lineChartData2,
            options: {
                responsive: true,
                hoverMode: 'index',
                stacked: false,
                title: {
                    display: false,
                    text: 'Grafico esperimento'
                },
                scales: {
                    yAxes: [{
                        type: 'linear',
                        display: true,
                        position: 'left',
                        id: 'y-axis-1',
                        ticks: {
                            max: 6,
                            min: minAmpere_A,
                        },
                        scaleLabel: {
                            display: true,
                            fontSize: 18,
                            labelString: "AMPERE",
                            fontColor: 'rgb(249, 161, 29)',
                        }
                    },{
                        type: 'linear',
                        display: true,
                        position: 'right',
                        id: 'y-axis-2',
                        ticks: {
                            max: 14,
                            min: 0,
                        },
                        scaleLabel: {
                            display: true,
                            fontSize: 18,
                            labelString: "VOLT",
                            fontColor: 'rgb(128, 128, 128)',
                        },
                        gridLines: {
                            drawOnChartArea: false,
                        },
                    }],
                    xAxes: [{
                        scaleLabel: {
                            display: true,
                            fontSize: 18,
                            labelString: "SECONDI",
                            fontColor: 'rgb(26,26,26)',
                        },
                    }]
                }
            }
        });
    }
});

// ************************************************************
// *************** DOWNLOAD RISULTATI AS CSV ******************

let saveFile = () => {

let data = "";
for (var i = 0; i < ascissa.length; i++) {

    // Aggiusto i dati per l'esportazione:
    // toFixed serve per impostare lo stesso numero di decimali
    // moltiplico per 1000 per passare da V ed A a mV e mA
    // necessario per differenza di virgola tra javascript (.) ed excel (,)

    CorrenteAlimentatore = datiCorrenteAlimentatore[i].toFixed(3)*1000;
    Tensione = datiTensione[i].toFixed(3)*1000;
    CorrenteCarico = datiCorrenteCarico[i].toFixed(3)*1000;
    Tempo = ascissa[i] * 1000;

    // costruzione dei dati da esportare
    if(riepilogoTest.test == "Carica"){
        data +=
            '\nTempo(ms) ' + Tempo + ' ' +
            'Corrente(mA) ' + CorrenteAlimentatore + ' ' +
            'Tensione(mV) ' + Tensione + ' \n'
      }
      if(riepilogoTest.test == "Scarica"){
        data +=
            '\nTempo(ms) ' + Tempo + ' ' +
            'Corrente(mA) ' + CorrenteCarico + ' ' +
            'Tensione(mV) ' + Tensione + ' \n'
        }
    }

    // Converto i dati in oggetto BLOB, e creo un file CSV
    const textToBLOB = new Blob([data], { type: 'text/csv' });
    const sFileName = 'test.csv';

    // download file creato
    let newLink = document.createElement("a");
    newLink.download = sFileName;
    // if chrome e safari
    if (window.webkitURL != null) {
      newLink.href = window.webkitURL.createObjectURL(textToBLOB);
    }
    // else mozilla
    else {
        newLink.href = window.URL.createObjectURL(textToBLOB);
        newLink.style.display = "none";
        document.body.appendChild(newLink);
    }
    newLink.click();
}

// ************* FINE DOWNLOAD RISULTATI AS CSV ***************
// ************************************************************