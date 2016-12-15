(function(window){
  window.extractData = function() {
    var ret = $.Deferred();

    function onError() {
      console.log('Loading error', arguments);
      ret.reject();
    }

    function onReady(smart)  {
      if (smart.hasOwnProperty('patient')) {
        var patient = smart.patient;
        var pt = patient.read();
        var obv = smart.patient.api.fetchAll({
                    type: 'Observation',
                    query: {
                      code: {
                        $or: ['http://loinc.org|8302-2', 'http://loinc.org|8462-4',
                              'http://loinc.org|8480-6', 'http://loinc.org|2085-9',
                              'http://loinc.org|2089-1', 'http://loinc.org|55284-4',
                              'http://loinc.org|3141-9','http://loinc.org|72166-2' ]
                      }
                    }
                  });

        $.when(pt, obv).fail(onError);

        $.when(pt, obv).done(function(patient, obv) {
          var byCodes = smart.byCodes(obv, 'code');
          var gender = patient.gender;
          var dob = new Date(patient.birthDate);
          var day = dob.getDate();
          var monthIndex = dob.getMonth() + 1;
          var year = dob.getFullYear();

          var dobStr = monthIndex + '/' + day + '/' + year;
          var fname = '';
          var lname = '';

          if (typeof patient.name[0] !== 'undefined') {
            fname = patient.name[0].given.join(' ');
            lname = patient.name[0].family.join(' ');
          }

          var height = byCodes('8302-2');
          var weight = byCodes('3141-9');
          var smokerstatus = byCodes('72166-2');
          console.log(smokerstatus);
         
          var systolicbp = getBloodPressureValue(byCodes('55284-4'),'8480-6');
          var diastolicbp = getBloodPressureValue(byCodes('55284-4'),'8462-4');
          var hdl = byCodes('2085-9');
          var ldl = byCodes('2089-1');

          var p = defaultPatient();
          p.birthdate = dobStr;
          p.gender = gender;
          p.fname = fname;
          p.lname = lname;
          p.age = parseInt(calculateAge(dob));
          p.height = getQuantityValueAndUnit(height[0]);
        p.height = calculateHeightinFeetandInches(p.height);
          p.weight = getQuantityValueAndUnit(weight[0]);
          p.weight =calulateWeightinPounds(p.weight);
          p.bmi = calculateBMI(height[0],weight[0]);
          p.smokestatus = getQuantityValueAndUnit(smokerstatus[0]);
          console.log(p.smokestatus);
          if (typeof systolicbp != 'undefined')  {
            p.systolicbp = systolicbp;
          }

          if (typeof diastolicbp != 'undefined') {
            p.diastolicbp = diastolicbp;
          }

          p.hdl = getQuantityValueAndUnit(hdl[0]);
          p.ldl = getQuantityValueAndUnit(ldl[0]);

          ret.resolve(p);
        });
      } else {
        onError();
      }
    }

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();

  };

  function defaultPatient(){
    return {
      fname: {value: ''},
      lname: {value: ''},
      gender: {value: ''},
      birthdate: {value: ''},
      age: {value: ''},
      height: {value: ''},
      weight: {value: ''},
      bmi: {value: ''},
      smokestatus: {value: ''},
      systolicbp: {value: ''},
      diastolicbp: {value: ''},
      ldl: {value: ''},
      hdl: {value: ''},
    };
  }

  function getBloodPressureValue(BPObservations, typeOfPressure) {
    var formattedBPObservations = [];
    BPObservations.forEach(function(observation){
      var BP = observation.component.find(function(component){
        return component.code.coding.find(function(coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        observation.valueQuantity = BP.valueQuantity;
        formattedBPObservations.push(observation);
      }
    });

    return getQuantityValueAndUnit(formattedBPObservations[0]);
  }

  function isLeapYear(year) {
    return new Date(year, 1, 29).getMonth() === 1;
  }

  function calculateAge(date) {
    if (Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date.getTime())) {
      var d = new Date(date), now = new Date();
      var years = now.getFullYear() - d.getFullYear();
      d.setFullYear(d.getFullYear() + years);
      if (d > now) {
        years--;
        d.setFullYear(d.getFullYear() - 1);
      }
      var days = (now.getTime() - d.getTime()) / (3600 * 24 * 1000);
      return years + days / (isLeapYear(now.getFullYear()) ? 366 : 365);
    }
    else {
      return undefined;
    }
  }

  function getQuantityValueAndUnit(ob) {
    if (typeof ob != 'undefined' &&
        typeof ob.valueQuantity != 'undefined' &&
        typeof ob.valueQuantity.value != 'undefined' &&
        typeof ob.valueQuantity.unit != 'undefined') {
          return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
    } else {
      return undefined;
    }
  }

  // added by nlf 
  function calculateHeightinFeetandInches(htcm) {
    if (typeof htcm === 'undefined') {
     alert("height is undefined"); 
      return htcm;
    }
    
    var parts = htcm.split(" cm");
    var realcm = parts[0];
    var inches = (realcm*0.393700787);
    
    var feet = Math.floor(inches / 12);
    inches %= 12
    return ( feet.toFixed(0) + ' ft ' + inches.toFixed(0) + ' in' + '(' + htcm +')');  
  }
  
  function calculateHeightinInches(htcm) {
    if (typeof htcm === 'undefined') {
     alert("height is undefined"); 
      return htcm;
    }
    
    var parts = htcm.split(" cm");
    var realcm = parts[0];
    var inches = (realcm*0.393700787);
    
    var feet = Math.floor(inches / 12);
    inches %= 12
    return ( feet + inches );
  }
  
  
  function calulateWeightinPounds(kgwt) {
    if (typeof kgwt === 'undefined') {
     alert("height is undefined"); 
      return htcm;
    }
    var parts = kgwt.split(" kg");
    var realkg = parts[0];
    var nearExact = realkg/0.45359237;
    var lbs = Math.floor(nearExact);
    var oz = (nearExact - lbs) * 16;
    return (lbs.toFixed(0) + 'lbs' + '(' + kgwt +')');
  }
  
  function calculateBMI(height,weight){
    // formula is Math.round((weight/(heightininches*heightin inches)) * 703.06957964);
  
    var wgtfromobject= getQuantityValueAndUnit(weight);
    var hgtfromobject = getQuantityValueAndUnit(height);
    
    var hgtparts = hgtfromobject.split(" cm");
    var hgtvalue = hgtparts[0];
    var inches = (hgtvalue*0.393700787);
    
    var wgtparts = wgtfromobject.split(" kg");
    var wgtvalue = wgtparts[0];
    var lbs = (wgtvalue/0.45359237);
    
    
    
    
    console.log(wgtfromobject);
    console.log(hgtfromobject);
   /// var inches = (height*0.393700787);
    
    //var nearExact = weight/0.45359237;
   // var lbs = Math.floor(nearExact);
    //var feet = Math.floor(inches / 12);
   // inches %= 12
   // var heightinInches = (feet + inches );
    var heightsquared = inches * inches;
    var bmi = Math.round((lbs/heightsquared) * 703.06957964);
    console.log("hello");
    console.log(height);
    console.log(weight);
    console.log(inches);
    console.log(lbs);
    console.log(bmi);
    return (bmi.toFixed(1));
    
  }
  // end added by nlf
  window.drawVisualization = function(p) {
    var fullname = p.fname + ' ' + p.lname;
    var ageindicator = '<strong>Age: </strong>' + p.age;
    var genderindicator = '<strong>Gender: </strong>' + p.gender;
    $('#holder').show();
    $('#loading').hide();
    $('#fullname').html(fullname);
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(genderindicator);
    $('#birthdate').html(p.birthdate);
    $('#age').html(ageindicator);
    $('#weight').html(p.weight);
    $('#bmi').html(p.bmi);
    $('#height').html(p.height);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);
    $('#well').show();
  };

})(window);
