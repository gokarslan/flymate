const http = require('http');
var parseString = require('xml2js').parseString;
/**
 * GET /contact
 * Contact form page.
 */
exports.getFlights = (req, res) => {
    let getResponse = res;
    console.log(req.query);
    
    var bodyAirShopping = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="http://www.iata.org/IATA/EDIST/2016.1"> ' +
    '<soapenv:Header/>' +
    '<soapenv:Body>' +
    '<ns:AirShoppingRQ Version="3.000">' +
    '<ns:Document/>' +
    '<ns:Party>' +
    '<ns:Sender>' +
    '<ns:TravelAgencySender>' +
    '<ns:AgencyID>HELAY08DC</ns:AgencyID>' +
    '</ns:TravelAgencySender>' +
    '</ns:Sender>' +
    '</ns:Party>' +
    '<ns:Travelers>' +
    '<!--1 or more repetitions:-->' +
    '<ns:Traveler>' +
    '<!--Optional:-->' +
    '<ns:AnonymousTraveler>' +
    '<ns:PTC Quantity="1">ADT</ns:PTC>' +
    '</ns:AnonymousTraveler>' +
    '<ns:AnonymousTraveler>' +
    '<ns:PTC Quantity="1">INF</ns:PTC>' +
    '</ns:AnonymousTraveler>' +
    '</ns:Traveler>' +
    '</ns:Travelers>' +
    '<ns:CoreQuery>' +
    '<ns:OriginDestinations>' +
    '<ns:OriginDestination>' + 
    '<ns:Departure>' +
    '<ns:AirportCode>' + req.query.departure + '</ns:AirportCode>' +
    '<ns:Date>' + req.query.date + '</ns:Date>' + //2017-10-15
    '</ns:Departure>' +
    '<ns:Arrival>' +
    '<ns:AirportCode>' + req.query.arrival + '</ns:AirportCode>' +
    '</ns:Arrival>' +
    '</ns:OriginDestination>' +
    '</ns:OriginDestinations>' +
    '</ns:CoreQuery>' +
    '<ns:Preference>' +
    '<ns:FarePreferences PreferencesContext="'+ req.query.preference +  '"/>' +
    '</ns:Preference>' +
    '</ns:AirShoppingRQ>' +
    '</soapenv:Body>' +
    '</soapenv:Envelope>';
    
    var postRequest = {
    host: "localhost",
    path: "/",
    port: 15000,
    method: "POST",
    headers: {
        'Cookie': "cookie",
        'Content-Type': 'text/xml',
        'Content-Length': Buffer.byteLength(bodyAirShopping)
    }
    };
    
    var buffer = "";
    var req = http.request( postRequest, function( res )    {
        //console.log( res.statusCode );
        var buffer = "";
        res.on( "data", function( data ) { 
            buffer = buffer + data; } );
        res.on( "end", function( data ) {
            parseString(buffer, function (err, result) {
                let myFlights = {};
                let segments = {};
                let data = result['SOAP-ENV:Envelope']['Body'][0]['AirShoppingRS'][0];
                if('Errors' in data){
                    console.log("No offer matching input criterias");
                    getResponse.end("No offer matching input criterias");
                    return;
                }
                
                let airlineOffers = data['OffersGroup'][0]['AirlineOffers'];
                let currency = data['Metadata'][0]['Other'][0]['OtherMetadata'][0]['CurrencyMetadatas'][0]['CurrencyMetadata'][0]['Name'][0];
                let dataLists = data['DataLists'];
                for(let i=0;i<dataLists.length;++i){
                    let dataList = dataLists[i];
                    let flightSegmentList = dataList['FlightSegmentList'][0]['FlightSegment'];

                    for(let j=0;j<flightSegmentList.length;++j){
                        let flightSegment = flightSegmentList[j];
                        let segmentKey = flightSegment['$']['SegmentKey'];
                        if(segmentKey in segments){
                            continue;
                        }
                        segments[segmentKey] = {};
                        let departure = flightSegment['Departure'][0];
                        segments[segmentKey]['departureAirport'] = departure['AirportCode'][0];
                        segments[segmentKey]['departureDate'] = departure['Date'][0];
                        segments[segmentKey]['departureTime'] = departure['Time'][0];
                        segments[segmentKey]['departureTerminal'] = departure['Terminal'][0]['Name'][0];
                        
                        let arrival = flightSegment['Arrival'][0];
                        segments[segmentKey]['arrivalAirport'] = arrival['AirportCode'][0];
                        segments[segmentKey]['arrivalDate'] = arrival['Date'][0];
                        segments[segmentKey]['arrivalTime'] = arrival['Time'][0];
                        segments[segmentKey]['arrivalTerminal'] = arrival['Terminal'][0]['Name'][0];
                        
                        segments[segmentKey]['marketingCarrier'] = flightSegment['MarketingCarrier'][0]['AirlineID'][0];
                        segments[segmentKey]['flightNumber'] = flightSegment['MarketingCarrier'][0]['FlightNumber'][0]
                        segments[segmentKey]['operatingCarrier'] = flightSegment['OperatingCarrier'][0]['AirlineID'][0];
                        
                        
                    }
                    let flightList = dataList['FlightList'][0]['Flight'];
                    for(let j=0;j<flightList.length;++j){
                        let flight = flightList[j];
                        let flightKey= flight['$']['FlightKey'];
                        let time = flight['Journey'][0]['Time'][0];
                        let segmentReferences = flight['SegmentReferences'][0];
                        
                        if(!(flightKey in myFlights)){
                            myFlights[flightKey] = {};
                        }
                        myFlights[flightKey]['time'] = time;
                        myFlights[flightKey]['segmentReferences'] = segments[segmentReferences];
                        console.log(flightKey);
                        //console.log(time);
                        //console.log(segmentReferences);
                        
                    }
                    /*let anonymousTravelerList = dataList['AnonymousTravelerList'][0]['AnonymousTraveler'];
                    console.log(anonymousTravelerList);*/
                    
                    /*let originDestinationList = dataList['OriginDestinationList'];
                    console.log(originDestinationList[0]['OriginDestination']);*/
                    /*let priceClassList = dataList['PriceClassList'][0]['PriceClass'];
                    console.log(priceClassList);*/
                    /*let serviceList = dataList['ServiceList'][0]['Service'];
                    console.log(serviceList);*/
                    
                    
                }
                
                for(let i = 0;i < airlineOffers.length; ++i){
                    let airlineOffer = airlineOffers[i]['AirlineOffer'];
                    for(let j=0; j < airlineOffer.length; ++j){
                        let offerID = airlineOffer[j]['OfferID'];
                        let pricedOffer = airlineOffer[j]['PricedOffer'];
                        for(let k=0; k< pricedOffer.length;++k){
                            var flightKey = "";
                            let offerPrice = pricedOffer[0]['OfferPrice'][0];
                            let offerID = offerPrice['$']['OfferItemID'];
                            let priceDetail = offerPrice['RequestedDate'][0]['PriceDetail'];
                            let totalAmount = priceDetail[0]['TotalAmount'][0]['SimpleCurrencyPrice'][0];
                            let taxes = priceDetail[0]['Taxes'][0]['Total'][0];
                            let basePrice = priceDetail[0]['BaseAmount'][0];
                            
                            let associations = offerPrice['RequestedDate'][0]['Associations'];
                            for(let l=0; l<associations.length;++l){
                                let association = associations[l];
                                if('ApplicableFlight' in association){
                                    flightKey = association['ApplicableFlight'][0]['FlightReferences'][0];
                                    if(!(flightKey in myFlights)){
                                        myFlights[flightKey] = {};
                                    }
                                    myFlights[flightKey]['totalAmount'] = totalAmount;
                                    myFlights[flightKey]['taxes'] = taxes;
                                    myFlights[flightKey]['basePrice'] = basePrice;
                                    myFlights[flightKey]['origin'] = association['ApplicableFlight'][0]['OriginDestinationReferences'][0].substring(0, 3);
                                    myFlights[flightKey]['destination'] = association['ApplicableFlight'][0]['OriginDestinationReferences'][0].substring(3, 6);
                                    
                                }else{
                                    if(flightKey != ""){
                                        myFlights[flightKey]['priceClassReference'] = association['PriceClass'][0]['PriceClassReference'][0];
                                    }else{
                                        console.log("This shouldn't be happened, <price class>");
                                    }
                                }
                                
                            }
                            if(flightKey != ""){
                                myFlights[flightKey]['offerID'] = offerID;
                                
                            }
                            
                        }   
                    }
                }
                getResponse.writeHead(200, {"Content-Type": "application/json"});
                myFlights['currency'] = currency;
                var json = JSON.stringify(myFlights);
                getResponse.end(json);

                
            });
    } );

    });

    req.on('error', function(e) {
           console.log('problem with request: ' + e.message);
           });
    
    req.write(bodyAirShopping);
    req.end();

};
