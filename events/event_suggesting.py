from eventbrite import Eventbrite
import pandas as pd
import json

def suggestEvents(flightJson, testDate=None):
    eventbrite = Eventbrite('JPFW2R7QDBH4J62PPDO2')
    
    
    flight = flightJson
    arrival_airport = flight["segmentReferences"]["arrivalAirport"]
    print ("arrival airport", arrival_airport)
    
    if testDate is None:
        date = flight["segmentReferences"]['arrivalDate']
        time = flight["segmentReferences"]['arrivalTime']
        arrival_time = date[:-1] + 'T' + time + ":00"
    else:
        time = flight["segmentReferences"]['arrivalTime']
        arrival_time = testDate[:-1] + 'T' + time + ":00"
    
    print (arrival_time)
    
    
    end_date = arrival_time[:8] + str(int(arrival_time[8:10]) + 3) + arrival_time[10:]

    print (end_date)
    
    
    airports = pd.read_csv('https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat', header=None)
    latitude = airports[airports[4] == arrival_airport][6]
    longitude = airports[airports[4] == arrival_airport][7]
    
    events = eventbrite.event_search(**{'sort_by': 'best', 
                                        'location.latitude': latitude, 'location.longitude': longitude, 
                                            "location.within":"70km", "start_date.range_start": arrival_time,
                                   "start_date.range_end": end_date, 'high_affinity_categories': 'business'})
    #return events
    
    
    response = {}
    
    if type(events) is str:
        return None
    else:
        if len(events['events']) < 3:
            response.append(events['events']['name']['text'])
        else:
            
            print ('ffdsfdsf')
            for event_name in events['events'][:3]:

                response[event_name['name']['text']] = event_name['url']
                #response.append(event_name['url'])

        return response
    
    
current_flight = {"time":"PT3H0M0.000S","segmentReferences":{"departureAirport":"HEL","departureDate":"2017-08-26Z","departureTime":"09:10","departureTerminal":"1","arrivalAirport":"SFO","arrivalDate":"2017-08-27Z","arrivalTime":"12:10","arrivalTerminal":"W","marketingCarrier":"AY","flightNumber":"355","operatingCarrier":"AY"},"totalAmount":"200.00","taxes":"40.00","basePrice":"160.00","origin":"HEL","destination":"NCE","priceClassReference":"Economy","offerID":"SULL-15806151678019274138-1-1"}
current_answer = suggestEvents(current_flight)
print (current_answer)
    