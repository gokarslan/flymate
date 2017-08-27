const http = require('http');
var parseString = require('xml2js').parseString;
var mysql = require('mysql');
/**
**/


/**
 * GET /flight/search
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
    /*'<ns:AnonymousTraveler>' +
    '<ns:PTC Quantity="1">INF</ns:PTC>' +
    '</ns:AnonymousTraveler>' +*/
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

                var myFlightsLen = 0;
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
                                        console.log("ASDASDASDAS")

                                    }
                                    myFlightsLen ++;
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
                                if(offerID.substring(offerID.length - 3, offerID.length - 2) == 2){
                                    myFlights[flightKey]['ecoscore'] = 59.3;  
                                }else{
                                    myFlights[flightKey]['ecoscore'] = 71.4;
                                }
                                
                            }

                        }
                    }
                }
                var counter = 0;
                for(var key in myFlights){
                    let offerid = myFlights[key]['offerID'];
                    let myFlight = myFlights[key];
                    var fullPriceBody= '<soapenv:Envelope '+
                    'xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" '+
                    'xmlns:ns="http://www.iata.org/IATA/EDIST/2016.1"> '+
                    '<soapenv:Header/>'+
                    '<soapenv:Body>'+
                    '<FlightPriceRQ Version="3.000" '+
                    'xmlns="http://www.iata.org/IATA/EDIST/2016.1"> '+
                    '<Document/>'+
                    '<Party>'+
                    '<Sender>'+
                    '<TravelAgencySender>'+
                    '<AgencyID>HELAY08DC</AgencyID>'+
                    '</TravelAgencySender>'+
                    '</Sender>'+
                    '</Party>'+
                    '<Travelers>'+
                    '<Traveler>'+
                    '<AnonymousTraveler ObjectKey="PAX1">'+
                    '<PTC>SJO</PTC>'+
                    '</AnonymousTraveler>'+
                    '</Traveler>'+
                    '</Travelers>'+
                    '<Query>'+
                    '<Offers>'+
                    '<Offer>'+
                    '<OfferID Owner="AY">'+ offerid.substring(0, offerid.length - 2) +'</OfferID>'+ //offer
                    '<OfferItemIDs>'+
                    '<OfferItemID Owner="AY">'+ offerid +'</OfferItemID>'+
                    '</OfferItemIDs>'+
                    '</Offer>'+
                    '</Offers>'+
                    '</Query>'+
                    '<Qualifier>'+
                    '<PaymentCardQualifiers>'+
                    '<Type>VI</Type>'+
                    '<IIN_Number>401299</IIN_Number>'+
                    '</PaymentCardQualifiers>'+
                    '</Qualifier>'+
                    '</FlightPriceRQ>'+
                    '</soapenv:Body>'+
                    '</soapenv:Envelope>';
                    var postRequest = {
                        host: "localhost",
                        path: "/",
                        port: 15000,
                        method: "POST",
                        headers: {
                            'Cookie': "cookie",
                            'Content-Type': 'text/xml',
                            'Content-Length': Buffer.byteLength(fullPriceBody)
                        }
                    };

                    var buffer = "";
                    var req = http.request( postRequest, function( res )    {
                        //console.log( res.statusCode );
                        counter ++;
                        var buffer = "";
                        res.on( "data", function( data ) {
                            buffer = buffer + data; } );
                        res.on( "end", function( data ) {
                            parseString(buffer, function (err, result) {
                                //console.log(buffer);
                                myFlight['totalAmount'] = result['SOAP-ENV:Envelope']['Body'][0]['FlightPriceRS'][0]['PricedFlightOffers'][0]['PricedFlightOffer'][0]['OfferPrice'][0]['RequestedDate'][0]['PriceDetail'][0]['TotalAmount'][0]['DetailCurrencyPrice'][0]['Total'][0]['_'];
                                if(counter == myFlightsLen){
                                    getResponse.writeHead(200, {"Content-Type": "application/json"});
                                        myFlights['currency'] = currency;
                                        var json = JSON.stringify(myFlights);
                                        getResponse.end(json);
                                }
                            });
                        });
                    });
                    req.on('error', function(e) {
                       console.log('problem with request: ' + e.message);
                    });

                    req.write(fullPriceBody);
                    req.end();


                }




            });
    } );

    });

    req.on('error', function(e) {
           console.log('problem with request: ' + e.message);
           });

    req.write(bodyAirShopping);
    req.end();

};

exports.getOrder = (req, res) =>{
    let getResponse  = res;
    let getRequest = req.query;
    let offer = req.query.offerid
    var bodyOrder = '<soapenv:Envelope ' + 'xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" '+ 'xmlns:ns="http://www.iata.org/IATA/EDIST/2016.1">'+
    '<soapenv:Header/>'+
    '<soapenv:Body>'+
    '<OrderCreateRQ Version="3.000" xmlns="http://www.iata.org/IATA/EDIST/2016.1">'+
    '<Document id="Order">'+
    '	<Name>Test toto Airline</Name>'+
    '	<ReferenceVersion>16.1</ReferenceVersion>'+
    '</Document>'+
    '<Party>'+
    '	<Sender>'+
    '	<TravelAgencySender>'+
    '		<IATA_Number>12345678</IATA_Number>'+
    '		<AgencyID>HELAY08DC</AgencyID>'+
    '	</TravelAgencySender>'+
    '</Sender>'+
    '</Party>'+
    '<Query>'+
    '<Passengers>'+
    '<Passenger ObjectKey="PAX1">'+
    '<PTC>ADT</PTC>'+
    '<Age>'+
    '	<BirthDate>' + req.query.birthdate +'</BirthDate>  '+          //AGE
    '</Age>'+
    '<Name>'+                                             //NAME
    '<Surname>'+ req.query.surname +'</Surname>'+
    '<Given>'+ req.query.name +'</Given>'+
    '<Title>'+ req.query.title +'</Title>'+
    '</Name>  '+
    '<Contacts>'+
    '<Contact>'+
    '<EmailContact>'+
    '	<Address>'+ req.query.email +'</Address> '+     //EMAIL
    '</EmailContact>'+
    '<PhoneContact>'+
    '	<Application>Home</Application>'+
    '	<Number CountryCode="1">'+ req.query.phone +'</Number> '+//PHONE
    '</PhoneContact>'+
    '</Contact>'+
    '</Contacts>'+
    '<FQTVs>'+
    '<TravelerFQTV_Information>'+
    '<AirlineID>AY</AirlineID>'+
    '<Account>'+
    '<Number>333030682632711</Number>'+
    '</Account>'+
    '</TravelerFQTV_Information>'+
    '</FQTVs>         '+
    '<Gender>'+ req.query.gender + '</Gender>  '+                       //GENDER
    '<PassengerIDInfo AllowDocumentInd="true">'+
    '	<PassengerDocument>'+                       // DOCUMENT
    '	<Type>PT</Type>'+
    '	<ID>'+ req.query.documentid + '</ID>'+
    '	<DateOfExpiration>2018-08-13</DateOfExpiration>'+
    '	<CountryOfIssuance>'+ req.query.country +'</CountryOfIssuance>'+
    '	<CountryOfResidence>'+ req.query.country +'</CountryOfResidence>'+
    '</PassengerDocument>'+
    '</PassengerIDInfo>'+
    '</Passenger>'+

    ' </Passengers>'+
    '<OrderItems>'+
    '<ShoppingResponse>'+
    '	<Owner>AY</Owner>'+
    '	<ResponseID>' + offer.substring(0, offer.length - 4)+ '</ResponseID>'+
    '	<Offers>'+
    '		<Offer>'+
    '			<OfferID Owner="AY">' +offer.substring(0, offer.length - 2) +'</OfferID>'+
    '			<OfferItems>'+
    '				<OfferItem>'+
    '					<OfferItemID Owner="AY">' + offer +'</OfferItemID>'+
    '					<Passengers>'+
    '						<PassengerReference>PAX1</PassengerReference>'+
    '					</Passengers>'+
    '				</OfferItem>'+
    '			</OfferItems>'+
    '		</Offer>'+
    '	</Offers>'+
    '</ShoppingResponse>'+
    /*'  <OfferItem>'+
    '	<OfferItemID Owner="AY">Seat_1</OfferItemID>'+
    '	<OfferItemType>'+
    '		<SeatItem>'+
    '			<SeatReference>SEAT1</SeatReference>'+
    '			<SeatAssociation>'+
    '				<SegmentReferences>SEG1</SegmentReferences>'+ //SEGMENT REFF
    '				<TravelerReference>PAX1</TravelerReference>'+
    '			</SeatAssociation>'+
    '		</SeatItem>'+
    '	</OfferItemType>'+
    '	  </OfferItem>'+*/
    '</OrderItems>'+
    '<Payments>'+
    '	<Payment>'+
    '		<Method>'+
    '			<PaymentCard>'+
    '				<CardCode>VI</CardCode>   '+           //PAYMENT
    '				<CardNumber>'+ req.query.cardno +'</CardNumber>'+
    '				<EffectiveExpireDate>'+
    '					<Expiration>'+ req.query.cardexp +'</Expiration>'+
    '				</EffectiveExpireDate>'+
    '			</PaymentCard>'+
    '		</Method>'+
    '		<Amount Code="EUR">'+ req.query.amount +'</Amount>'+ // AMOUNT
    '	</Payment>'+
    '</Payments>'+
    '<DataLists>'+
    '	<FlightSegmentList>'+
    '	    <FlightSegment SegmentKey="SEG1">'+
    '		<Departure>'+
    '			<AirportCode>' + req.query.departure +'</AirportCode>'+
    '			<Date>'+ req.query.date +'</Date>'+
    '		</Departure>'+
    '		<Arrival>'+
    '			<AirportCode>' + req.query.arrival +'</AirportCode>'+
    '		</Arrival>'+
    '			<MarketingCarrier>'+
    '			   <AirlineID>AY</AirlineID>'+
    '			   <FlightNumber>'+ req.query.flightno +'</FlightNumber>'+
    '			</MarketingCarrier>'+
    '	    </FlightSegment>'+
    '	</FlightSegmentList>'+
    '	<SeatList>'+
    '         <Seats ListKey="SEAT1">'+
    '		<Location>'+
    '			<Column>B</Column>'+
    '			<Row>'+
    '				<Number>02</Number>'+
    '			</Row>'+
    '		</Location>'+
    '	    </Seats>'+
    '	</SeatList>'+
    '</DataLists>'+
    '</Query>'+
    '</OrderCreateRQ>'+
    '  </soapenv:Body>'+
    '</soapenv:Envelope>';
    //res.end(bodyOrder);
    var postRequest = {
        host: "localhost",
        path: "/",
        port: 15000,
        method: "POST",
        headers: {
            'Cookie': "cookie",
            'Content-Type': 'text/xml',
            'Content-Length': Buffer.byteLength(bodyOrder)
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
                console.log(buffer);
                let data = result['SOAP-ENV:Envelope']['Body'][0]['OrderViewRS'][0];

                if('Errors'  in data){
                    getResponse.end(buffer)
                    return;
                }

                let orderID = result['SOAP-ENV:Envelope']['Body'][0]['OrderViewRS'][0]['Response'][0]['Order'][0]['OrderID'][0]['_'];

                var con = mysql.createConnection({
                    host: "localhost",
                    user: "flymate",
                    password: "flymate",
                    database: "flymate"
                });
                let insertSQL = 'INSERT INTO bookings (full_name, email, flight_no, activity, have_baby, hate_baby, green, seat, order_id, ecoscore) VALUES ( ' +
                '"' + getRequest.name + " " + getRequest.surname + '", ' +
                '"' + getRequest.email + '", ' + 
                '"' + getRequest.flightno + '", ' + 
                '"' + getRequest.activity + '", ' + 
                '"' + getRequest.have_baby + '", ' + 
                '"' + getRequest.hate_baby + '", ' + 
                '"' + getRequest.green + '", ' + 
                '"' + '11F' + '", ' + 
                '"' + orderID + '",' + 
                '"' + getRequest.ecoscore + '"' + 
                ');';    
                con.connect(function(err) {
                    if (err) throw err;
                    //console.log("Connected!");
                    con.query(insertSQL, function (err, result) {
                    if (err) throw err;
                        let insertId = result['insertId'];
                        let getQuery = "SELECT * FROM bookings WHERE flight_no = " + '"' + getRequest.flightno + '";';
                        let seats = {};
                        con.query(getQuery,function (err, result) {
                            if (err) throw err;
                            for(let i=0;i<result.length;++i){
                                let seatNumber = result[i]['seat'];
                                if(seatNumber == "11F"){
                                    continue;
                                }
                                var seat = seats[seatNumber] = {};
                                seat['activity'] =result[i]['activity'];
                                seat['haveBaby'] =result[i]['have_baby'];
                                seat['hateBaby'] =result[i]['hate_baby'];
                                seat['green'] =result[i]['green'];
                            }

                            //console.log(seats);
                            choosenSeat = chooseSeat(getRequest.activity, getRequest.hate_baby, seats)
                            //console.log(choosenSeat);
                            getResponse.writeHead(200, {"Content-Type": "application/json"});
                            jsonObj = {};
                            jsonObj['seats'] = seats;
                            jsonObj['choosenSeat'] = choosenSeat;
                            jsonObj['id'] = insertId;
                            var json = JSON.stringify(jsonObj);
                            getResponse.end(json);
                        });
                    });
                });

            });
        });
    });
    req.on('error', function(e) {
           console.log('problem with request: ' + e.message);
           });

    req.write(bodyOrder);
    req.end();

}
exports.getValidateFlight = (req, res) =>{


    let getResponse = res;
    var bodyValidate = '<soapenv:Envelope   '+ 'xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" '+ 'xmlns:ns="http://www.iata.org/IATA/EDIST/2016.1">'+
 '  <soapenv:Header/>'+
 '  <soapenv:Body>'+
 ' <OrderRetrieveRQ Version="3.000" xmlns="http://www.iata.org/IATA/EDIST/2016.1">'+
	'<Document/>'+
	'<Party>'+
	'	<Sender>'+
	'		<TravelAgencySender>'+
	'			<IATA_Number>12345678</IATA_Number>'+
	'			<AgencyID>NCE6X0100</AgencyID>'+
	'		</TravelAgencySender>'+
	'	</Sender>'+
	'</Party>'+
	'<Query>'+
	'	<Filters>'+
	'		<OrderID Owner="AY">' + req.query.orderid + '</OrderID>'+
	'	</Filters>'+
	'</Query>'+
'</OrderRetrieveRQ>'+
'   </soapenv:Body>'+
'</soapenv:Envelope>';
    var postRequest = {
        host: "localhost",
        path: "/",
        port: 15000,
        method: "POST",
        headers: {
            'Cookie': "cookie",
            'Content-Type': 'text/xml',
            'Content-Length': Buffer.byteLength(bodyValidate)
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
                let data = result['SOAP-ENV:Envelope']['Body'][0]['OrderViewRS'][0];
                //console.log(data);
                if('Errors' in data){
                    getResponse.end("notfound")
                    return;
                }

                /*let orderID = result['SOAP-ENV:Envelope']['Body'][0]['OrderViewRS'][0]['Response'][0]['Order'][0]['OrderID'][0]['_'];*/
                getResponse.end(buffer);
            });
        });
    });
    req.on('error', function(e) {
           console.log('problem with request: ' + e.message);
           });

    req.write(bodyValidate);
    req.end();


}

exports.getEco = (req, res) =>{
    res.render('flymate/eco', {
    });
    $("button").toggle(function(){
        $("button").css("color", "red");
    });
};



exports.getUpdateSeat = (req, res) =>{
    let getResponse = res;
    var con = mysql.createConnection({
        host: "localhost",
        user: "flymate",
        password: "flymate",
        database: "flymate"
    });
    let updateSQL = 'UPDATE bookings SET seat = "'+ req.query.seat + '" WHERE id = "' + req.query.id + '"';
    con.connect(function(err) {
        if (err) throw err;
        //console.log("Connected!");
        con.query(updateSQL, function (err, result) {
            if (err) throw err;
            getResponse.end("Success!");

        });
    });


}
exports.getEcoScore = (req, res) =>{
    let getResponse = res;
    var con = mysql.createConnection({
        host: "localhost",
        user: "flymate",
        password: "flymate",
        database: "flymate"
    });
    let updateSQL = 'SELECT ecoscore FROM bookings WHERE email = "' + req.query.email + '"'; 
    con.connect(function(err) {
        if (err) throw err;
        //console.log("Connected!");
        con.query(updateSQL, function (err, result) {
            if (err) throw err;
            var count = 0;
            for(let i=0;i<result.length;++i){
                count += result[i]['ecoscore'];
            }
            res.end("" + count);
            
        });
    });
    
    
} 
function chooseSeat(activity, hateBaby, seats){
    var seat = "1A";
    var max = 61;
    while(max-- >= 0){
        if(seat in seats){
            seat = increaseSeat(seat);
            continue;
        }
        if(hateBaby == "yes" && checkNeighborsBaby(seat, seats) == "yes"){
            console.log("here");
            seat = increaseSeat(seat);
            continue;
        }
        if(activity == "sleep" && checkNeighborsActivity(seat, seats, "sleep") == "yes"){
            seat = increaseSeat(seat);
            continue;
        }
        if(activity == "talk" && checkNeighborsActivity(seat, seats, "talk") == "yes"){
            seat = increaseSeat(seat);
            continue;
        }
        if(activity == "work" && checkNeighborsActivity(seat, seats, "work") == "yes"){
            seat = increaseSeat(seat);
            continue;
        }
        return seat;
    }
    return "FF";

}
function checkNeighborsBaby(seat, seats){
    let previousSeat = decreaseSeat(seat);
    let nextSeat = increaseSeat(seat);
    if(previousSeat in seats){
        if(seats[previousSeat]['haveBaby'] == "yes"){
            return "yes";
        }
    }
    if(nextSeat in seats){
        if(seats[nextSeat]['haveBaby'] == "yes"){
            return "yes";
        }
    }
    return "no";

}
function checkNeighborsActivity(seat, seats, activity){
    let previousSeat = decreaseSeat(seat);
    let nextSeat = increaseSeat(seat);
    if(previousSeat in seats){
        if(seats[previousSeat]['activity'] != activity){
            return "yes";
        }
    }
    if(nextSeat in seats){
        if(seats[nextSeat]['activity'] != activity){
            return "yes";
        }
    }
    return "no";

}

function decreaseSeat(seat){//suppose 10F is not feeded.
    if(seat.length == 3){
        if(seat.substring(2, 3) == "A"){
            return "9F";
        }
        return seat.substring(0, 2) + previousChar(seat.substring(2,3))
    }
    if(seat.substring(1,2) != "A"){
        return seat.substring(0, 1) + previousChar(seat.substring(1,2));
    }
    return "" + (parseInt(seat.substring(0, 1)) - 1) + "F";
}
function previousChar(c) {
    return String.fromCharCode(c.charCodeAt(0) - 1);
}
function nextChar(c) {
    return String.fromCharCode(c.charCodeAt(0) + 1);
}
function increaseSeat(seat){//suppose 10F is not feeded.
    if(seat.length == 3){
        return seat.substring(0, 2) + nextChar(seat.substring(2,3))
    }
    if(seat.substring(1,2) != "F"){
        return seat.substring(0, 1) + nextChar(seat.substring(1,2));
    }
    return "" + (parseInt(seat.substring(0, 1)) + 1) + "A";
}
function nextChar(c) {
    return String.fromCharCode(c.charCodeAt(0) + 1);
}
