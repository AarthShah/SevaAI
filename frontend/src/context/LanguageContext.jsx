import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const dictionaries = {
  hi: {
    'Home':'होम','Report Issue':'समस्या दर्ज करें','Track Complaint':'शिकायत ट्रैक करें','My Complaints':'मेरी शिकायतें','Municipal Portal':'नगरपालिका पोर्टल','Municipal Command Center':'नगरपालिका कमांड सेंटर','Citizen View':'नागरिक दृश्य','Field Crew':'फील्ड टीम','Field Crew Workspace':'फील्ड टीम कार्यक्षेत्र','Triage & Dispatch':'जांच और कार्य आवंटन','AI Dispatch Review':'एआई कार्य समीक्षा','Departments':'विभाग','CCTV AI Vision':'सीसीटीवी एआई दृश्य','Operations Map':'संचालन मानचित्र','Analytics & Reports':'विश्लेषण और रिपोर्ट','Switch to Municipal Officer Portal':'नगरपालिका अधिकारी पोर्टल पर जाएं','Switch to Citizen Portal':'नागरिक पोर्टल पर जाएं','Sign In':'साइन इन','Register':'पंजीकरण','Search by complaint ID, location, or keywords...':'शिकायत आईडी, स्थान या शब्दों से खोजें...','Notifications':'सूचनाएं','Sign Out':'साइन आउट','Municipal Corporation Body':'नगर निगम','Kolhapur Municipal Corporation, Maharashtra':'कोल्हापुर महानगरपालिका, महाराष्ट्र','Today’s assignments':'आज के कार्य','Today\'s assignments':'आज के कार्य','Assigned work':'आवंटित कार्य','Landmark':'प्रमुख स्थान','Upload completion photo':'काम पूरा होने की फोटो अपलोड करें','Submit completion':'कार्य पूर्ण जमा करें','Route':'मार्ग','Next stop':'अगला पड़ाव','Completed':'पूरा हुआ','Pending':'लंबित','Priority':'प्राथमिकता','Status':'स्थिति','Location':'स्थान','Department':'विभाग','Description':'विवरण','Report an Issue':'समस्या दर्ज करें','Submit Report':'रिपोर्ट जमा करें','Track':'ट्रैक करें','English':'अंग्रेज़ी','Hindi':'हिन्दी','Marathi':'मराठी','Kannada':'ಕನ್ನಡ','Tamil':'தமிழ்','Language':'भाषा','AI Computer Vision Auto-Dispatch Threshold':'एआई कंप्यूटर विज़न ऑटो-डिस्पैच सीमा','City boundaries, autonomous AI dispatch sensitivity, and SLA escalation thresholds.':'शहर की सीमाएं, स्वचालित एआई कार्य आवंटन और SLA वृद्धि सीमाएं।'
  },
  mr: {
    'Home':'मुख्यपृष्ठ','Report Issue':'समस्या नोंदवा','Track Complaint':'तक्रार ट्रॅक करा','My Complaints':'माझ्या तक्रारी','Municipal Portal':'महानगरपालिका पोर्टल','Municipal Command Center':'महानगरपालिका नियंत्रण केंद्र','Citizen View':'नागरिक दृश्य','Field Crew':'मैदानी पथक','Field Crew Workspace':'मैदानी पथक कार्यक्षेत्र','Triage & Dispatch':'तपासणी आणि काम वाटप','AI Dispatch Review':'एआय कामाचा आढावा','Departments':'विभाग','CCTV AI Vision':'सीसीटीव्ही एआय दृश्य','Operations Map':'कामकाजाचा नकाशा','Analytics & Reports':'विश्लेषण आणि अहवाल','Switch to Municipal Officer Portal':'महानगरपालिका अधिकारी पोर्टलवर जा','Switch to Citizen Portal':'नागरिक पोर्टलवर जा','Sign In':'साइन इन','Register':'नोंदणी','Search by complaint ID, location, or keywords...':'तक्रार आयडी, ठिकाण किंवा शब्द शोधा...','Notifications':'सूचना','Sign Out':'साइन आउट','Municipal Corporation Body':'महानगरपालिका','Kolhapur Municipal Corporation, Maharashtra':'कोल्हापूर महानगरपालिका, महाराष्ट्र','Today’s assignments':'आजची कामे','Today\'s assignments':'आजची कामे','Assigned work':'वाटप केलेली कामे','Landmark':'जवळची खूण','Upload completion photo':'काम पूर्ण झाल्याचा फोटो अपलोड करा','Submit completion':'काम पूर्ण झाल्याची नोंद करा','Route':'मार्ग','Next stop':'पुढील थांबा','Completed':'पूर्ण','Pending':'प्रलंबित','Priority':'प्राधान्य','Status':'स्थिती','Location':'ठिकाण','Department':'विभाग','Description':'वर्णन','Report an Issue':'समस्या नोंदवा','Submit Report':'अहवाल सादर करा','Track':'ट्रॅक करा','English':'इंग्रजी','Hindi':'हिंदी','Marathi':'मराठी','Kannada':'ಕನ್ನಡ','Tamil':'தமிழ்','Language':'भाषा','AI Computer Vision Auto-Dispatch Threshold':'एआय संगणक दृष्टी स्वयंचलित वाटप मर्यादा','City boundaries, autonomous AI dispatch sensitivity, and SLA escalation thresholds.':'शहराच्या सीमा, स्वयंचलित एआय काम वाटप आणि SLA वाढीच्या मर्यादा.'
  },
  kn: {
    'Home':'ಮುಖಪುಟ','Report Issue':'ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ','Track Complaint':'ದೂರನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ','My Complaints':'ನನ್ನ ದೂರುಗಳು','Municipal Portal':'ಮುನಿಸಿಪಲ್ ಪೋರ್ಟಲ್','Municipal Command Center':'ಮುನಿಸಿಪಲ್ ನಿಯಂತ್ರಣ ಕೇಂದ್ರ','Citizen View':'ನಾಗರಿಕರ ನೋಟ','Field Crew':'ಕ್ಷೇತ್ರ ಸಿಬ್ಬಂದಿ','Field Crew Workspace':'ಕ್ಷೇತ್ರ ಸಿಬ್ಬಂದಿ ಕಾರ್ಯಕ್ಷೇತ್ರ','Triage & Dispatch':'ಪರಿಶೀಲನೆ ಮತ್ತು ಕೆಲಸ ಹಂಚಿಕೆ','AI Dispatch Review':'AI ಕೆಲಸ ಪರಿಶೀಲನೆ','Departments':'ವಿಭಾಗಗಳು','CCTV AI Vision':'CCTV AI ದೃಷ್ಟಿ','Operations Map':'ಕಾರ್ಯಾಚರಣೆ ನಕ್ಷೆ','Analytics & Reports':'ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ವರದಿಗಳು','Switch to Municipal Officer Portal':'ಮುನಿಸಿಪಲ್ ಅಧಿಕಾರಿ ಪೋರ್ಟಲ್‌ಗೆ ಬದಲಿಸಿ','Switch to Citizen Portal':'ನಾಗರಿಕ ಪೋರ್ಟಲ್‌ಗೆ ಬದಲಿಸಿ','Sign In':'ಸೈನ್ ಇನ್','Register':'ನೋಂದಣಿ','Search by complaint ID, location, or keywords...':'ದೂರು ID, ಸ್ಥಳ ಅಥವಾ ಪದಗಳಿಂದ ಹುಡುಕಿ...','Notifications':'ಅಧಿಸೂಚನೆಗಳು','Sign Out':'ಸೈನ್ ಔಟ್','Municipal Corporation Body':'ಮುನಿಸಿಪಲ್ ನಿಗಮ','Kolhapur Municipal Corporation, Maharashtra':'ಕೊಲ್ಹಾಪುರ ಮಹಾನಗರ ಪಾಲಿಕೆ, ಮಹಾರಾಷ್ಟ್ರ','Today’s assignments':'ಇಂದಿನ ಕೆಲಸಗಳು','Today\'s assignments':'ಇಂದಿನ ಕೆಲಸಗಳು','Assigned work':'ಹಂಚಿದ ಕೆಲಸ','Landmark':'ಹೆಗ್ಗುರುತು','Upload completion photo':'ಕೆಲಸ ಪೂರ್ಣಗೊಂಡ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ','Submit completion':'ಪೂರ್ಣಗೊಳಿಸಿದ ಕೆಲಸ ಸಲ್ಲಿಸಿ','Route':'ಮಾರ್ಗ','Next stop':'ಮುಂದಿನ ನಿಲ್ದಾಣ','Completed':'ಪೂರ್ಣಗೊಂಡಿದೆ','Pending':'ಬಾಕಿ','Priority':'ಆದ್ಯತೆ','Status':'ಸ್ಥಿತಿ','Location':'ಸ್ಥಳ','Department':'ವಿಭಾಗ','Description':'ವಿವರಣೆ','Report an Issue':'ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ','Submit Report':'ವರದಿ ಸಲ್ಲಿಸಿ','Track':'ಟ್ರ್ಯಾಕ್ ಮಾಡಿ','English':'ಇಂಗ್ಲಿಷ್','Hindi':'ಹಿಂದಿ','Marathi':'ಮರಾಠಿ','Kannada':'ಕನ್ನಡ','Tamil':'ತಮಿಳು','Language':'ಭಾಷೆ','AI Computer Vision Auto-Dispatch Threshold':'AI ಕಂಪ್ಯೂಟರ್ ದೃಷ್ಟಿ ಸ್ವಯಂ ಹಂಚಿಕೆ ಮಿತಿ','City boundaries, autonomous AI dispatch sensitivity, and SLA escalation thresholds.':'ನಗರದ ಗಡಿಗಳು, ಸ್ವಯಂಚಾಲಿತ AI ಕೆಲಸ ಹಂಚಿಕೆ ಮತ್ತು SLA ಏರಿಕೆ ಮಿತಿಗಳು.'
  },
  ta: {
    'Home':'முகப்பு','Report Issue':'புகார் அளிக்கவும்','Track Complaint':'புகாரைக் கண்காணிக்கவும்','My Complaints':'எனது புகார்கள்','Municipal Portal':'நகராட்சி தளம்','Municipal Command Center':'நகராட்சி கட்டுப்பாட்டு மையம்','Citizen View':'குடிமக்கள் பார்வை','Field Crew':'களப் பணியாளர்கள்','Field Crew Workspace':'களப் பணியாளர் பணியிடம்','Triage & Dispatch':'ஆய்வு மற்றும் பணி ஒதுக்கீடு','AI Dispatch Review':'AI பணி மதிப்பாய்வு','Departments':'துறைகள்','CCTV AI Vision':'CCTV AI பார்வை','Operations Map':'செயல்பாட்டு வரைபடம்','Analytics & Reports':'பகுப்பாய்வு மற்றும் அறிக்கைகள்','Switch to Municipal Officer Portal':'நகராட்சி அலுவலர் தளத்திற்கு மாறவும்','Switch to Citizen Portal':'குடிமக்கள் தளத்திற்கு மாறவும்','Sign In':'உள்நுழைக','Register':'பதிவு செய்க','Search by complaint ID, location, or keywords...':'புகார் எண், இடம் அல்லது சொற்களால் தேடவும்...','Notifications':'அறிவிப்புகள்','Sign Out':'வெளியேறு','Municipal Corporation Body':'நகராட்சி மாநகராட்சி','Kolhapur Municipal Corporation, Maharashtra':'கோலாப்பூர் மாநகராட்சி, மகாராஷ்டிரா','Today’s assignments':'இன்றைய பணிகள்','Today\'s assignments':'இன்றைய பணிகள்','Assigned work':'ஒதுக்கப்பட்ட பணி','Landmark':'அடையாள இடம்','Upload completion photo':'பணி முடிந்த புகைப்படத்தைப் பதிவேற்றவும்','Submit completion':'பணி முடிவைச் சமர்ப்பிக்கவும்','Route':'வழி','Next stop':'அடுத்த நிறுத்தம்','Completed':'முடிந்தது','Pending':'நிலுவையில்','Priority':'முன்னுரிமை','Status':'நிலை','Location':'இடம்','Department':'துறை','Description':'விளக்கம்','Report an Issue':'புகார் அளிக்கவும்','Submit Report':'அறிக்கையைச் சமர்ப்பிக்கவும்','Track':'கண்காணிக்கவும்','English':'ஆங்கிலம்','Hindi':'இந்தி','Marathi':'மராத்தி','Kannada':'கன்னடம்','Tamil':'தமிழ்','Language':'மொழி','AI Computer Vision Auto-Dispatch Threshold':'AI கணினி பார்வை தானியங்கி ஒதுக்கீட்டு வரம்பு','City boundaries, autonomous AI dispatch sensitivity, and SLA escalation thresholds.':'நகர எல்லைகள், தானியங்கி AI பணி ஒதுக்கீடு மற்றும் SLA உயர்வு வரம்புகள்.'
  }
};

const extraDictionaries = {
  hi: {
    'OPERATIONS':'संचालन','MONITORING':'निगरानी','ADMINISTRATION':'प्रशासन','Resolved Issues':'समाधान की गई समस्याएं','Reports':'रिपोर्ट','CCTV & AI Vision':'सीसीटीवी और एआई दृश्य','AI Audit & Activity Logs':'एआई ऑडिट और गतिविधि लॉग','Users & Roles':'उपयोगकर्ता और भूमिकाएं','Settings':'सेटिंग्स','Municipal Command Center Configuration':'नगरपालिका कमांड सेंटर कॉन्फ़िगरेशन','Save Configuration':'कॉन्फ़िगरेशन सहेजें','hours (High Priority)':'घंटे (उच्च प्राथमिकता)','hours (Standard SLA)':'घंटे (मानक SLA)','Detections from smart CCTV streams exceeding this threshold automatically initiate field work orders.':'इस सीमा से अधिक स्मार्ट सीसीटीवी पहचान पर फील्ड कार्य आदेश अपने आप शुरू होते हैं।','Emergency Defect Escalation Timeout':'आपातकालीन समस्या वृद्धि समय सीमा','4 hours (High Priority)':'4 घंटे (उच्च प्राथमिकता)','8 hours':'8 घंटे','24 hours (Standard SLA)':'24 घंटे (मानक SLA)','Drainage & Stormwater Department':'जल निकासी और वर्षा जल विभाग','Missing Sidewalk Manhole Cover':'फुटपाथ का मैनहोल ढक्कन गायब है','In Progress':'कार्य जारी है','Submitted':'जमा किया गया','Assigned':'आवंटित','Resolved':'समाधान किया गया','High':'उच्च','Medium':'मध्यम','Low':'कम','Critical':'गंभीर','Pothole':'गड्ढा','Garbage':'कचरा','Water Leak':'पानी का रिसाव','Streetlight':'स्ट्रीट लाइट','Operations Map':'संचालन मानचित्र','Field Crew':'फील्ड टीम'
  },
  mr: {
    'OPERATIONS':'कामकाज','MONITORING':'देखरेख','ADMINISTRATION':'प्रशासन','Resolved Issues':'सोडवलेल्या समस्या','Reports':'अहवाल','CCTV & AI Vision':'सीसीटीव्ही आणि एआय दृश्य','AI Audit & Activity Logs':'एआय ऑडिट आणि क्रियाकलाप नोंदी','Users & Roles':'वापरकर्ते आणि भूमिका','Settings':'सेटिंग्ज','Municipal Command Center Configuration':'महानगरपालिका नियंत्रण केंद्र संरचना','Save Configuration':'संरचना जतन करा','Detections from smart CCTV streams exceeding this threshold automatically initiate field work orders.':'या मर्यादेपेक्षा जास्त स्मार्ट सीसीटीव्ही शोधांमुळे मैदानी कामाचे आदेश आपोआप सुरू होतात.','Emergency Defect Escalation Timeout':'आपत्कालीन समस्येची वाढीव वेळ मर्यादा','4 hours (High Priority)':'4 तास (उच्च प्राधान्य)','8 hours':'8 तास','24 hours (Standard SLA)':'24 तास (मानक SLA)','Drainage & Stormwater Department':'जलनिस्सारण आणि पावसाचे पाणी विभाग','Missing Sidewalk Manhole Cover':'पदपथावरील मॅनहोलचे झाकण गायब','In Progress':'काम सुरू आहे','Submitted':'सादर केले','Assigned':'वाटप केले','Resolved':'सोडवले','High':'उच्च','Medium':'मध्यम','Low':'कमी','Critical':'गंभीर','Pothole':'खड्डा','Garbage':'कचरा','Water Leak':'पाण्याची गळती','Streetlight':'पथदिवा','Operations Map':'कामकाजाचा नकाशा','Field Crew':'मैदानी पथक'
  },
  kn: {
    'OPERATIONS':'ಕಾರ್ಯಾಚರಣೆ','MONITORING':'ಮೇಲ್ವಿಚಾರಣೆ','ADMINISTRATION':'ಆಡಳಿತ','Resolved Issues':'ಪರಿಹರಿಸಿದ ಸಮಸ್ಯೆಗಳು','Reports':'ವರದಿಗಳು','CCTV & AI Vision':'CCTV ಮತ್ತು AI ದೃಷ್ಟಿ','AI Audit & Activity Logs':'AI ಪರಿಶೀಲನೆ ಮತ್ತು ಚಟುವಟಿಕೆ ದಾಖಲೆಗಳು','Users & Roles':'ಬಳಕೆದಾರರು ಮತ್ತು ಪಾತ್ರಗಳು','Settings':'ಸೆಟ್ಟಿಂಗ್‌ಗಳು','Municipal Command Center Configuration':'ಮುನಿಸಿಪಲ್ ನಿಯಂತ್ರಣ ಕೇಂದ್ರ ಸಂರಚನೆ','Save Configuration':'ಸಂರಚನೆಯನ್ನು ಉಳಿಸಿ','Detections from smart CCTV streams exceeding this threshold automatically initiate field work orders.':'ಈ ಮಿತಿಗಿಂತ ಹೆಚ್ಚಿನ ಸ್ಮಾರ್ಟ್ CCTV ಪತ್ತೆಗಳು ಕ್ಷೇತ್ರ ಕೆಲಸದ ಆದೇಶಗಳನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಪ್ರಾರಂಭಿಸುತ್ತವೆ.','Emergency Defect Escalation Timeout':'ತುರ್ತು ಸಮಸ್ಯೆ ಉನ್ನತೀಕರಣ ಸಮಯ ಮಿತಿ','4 hours (High Priority)':'4 ಗಂಟೆ (ಹೆಚ್ಚಿನ ಆದ್ಯತೆ)','8 hours':'8 ಗಂಟೆ','24 hours (Standard SLA)':'24 ಗಂಟೆ (ಪ್ರಮಾಣಿತ SLA)','Drainage & Stormwater Department':'ಚರಂಡಿ ಮತ್ತು ಮಳೆನೀರು ಇಲಾಖೆ','Missing Sidewalk Manhole Cover':'ಪಾದಚಾರಿ ಮಾರ್ಗದ ಮ್ಯಾನ್‌ಹೋಲ್ ಮುಚ್ಚಳ ಕಾಣೆಯಾಗಿದೆ','In Progress':'ಪ್ರಗತಿಯಲ್ಲಿದೆ','Submitted':'ಸಲ್ಲಿಸಲಾಗಿದೆ','Assigned':'ಹಂಚಲಾಗಿದೆ','Resolved':'ಪರಿಹರಿಸಲಾಗಿದೆ','High':'ಹೆಚ್ಚು','Medium':'ಮಧ್ಯಮ','Low':'ಕಡಿಮೆ','Critical':'ತೀವ್ರ','Pothole':'ಗುಂಡಿ','Garbage':'ಕಸ','Water Leak':'ನೀರಿನ ಸೋರಿಕೆ','Streetlight':'ಬೀದಿ ದೀಪ','Operations Map':'ಕಾರ್ಯಾಚರಣೆ ನಕ್ಷೆ','Field Crew':'ಕ್ಷೇತ್ರ ಸಿಬ್ಬಂದಿ'
  },
  ta: {
    'OPERATIONS':'செயல்பாடுகள்','MONITORING':'கண்காணிப்பு','ADMINISTRATION':'நிர்வாகம்','Resolved Issues':'தீர்க்கப்பட்ட பிரச்சினைகள்','Reports':'அறிக்கைகள்','CCTV & AI Vision':'CCTV மற்றும் AI பார்வை','AI Audit & Activity Logs':'AI தணிக்கை மற்றும் செயல்பாட்டு பதிவுகள்','Users & Roles':'பயனர்கள் மற்றும் பொறுப்புகள்','Settings':'அமைப்புகள்','Municipal Command Center Configuration':'நகராட்சி கட்டுப்பாட்டு மைய அமைப்பு','Save Configuration':'அமைப்பைச் சேமிக்கவும்','Detections from smart CCTV streams exceeding this threshold automatically initiate field work orders.':'இந்த வரம்பை மீறும் ஸ்மார்ட் CCTV கண்டறிதல்கள் களப்பணிகளைத் தானாகத் தொடங்கும்.','Emergency Defect Escalation Timeout':'அவசரப் பிரச்சினை உயர்வு காலவரம்பு','4 hours (High Priority)':'4 மணி (உயர் முன்னுரிமை)','8 hours':'8 மணி','24 hours (Standard SLA)':'24 மணி (நிலையான SLA)','Drainage & Stormwater Department':'வடிகால் மற்றும் மழைநீர் துறை','Missing Sidewalk Manhole Cover':'நடைபாதை மேன்ஹோல் மூடி காணவில்லை','In Progress':'நடைபெறுகிறது','Submitted':'சமர்ப்பிக்கப்பட்டது','Assigned':'ஒதுக்கப்பட்டது','Resolved':'தீர்க்கப்பட்டது','High':'உயர்','Medium':'நடுத்தரம்','Low':'குறைவு','Critical':'மிக அவசரம்','Pothole':'சாலைப் பள்ளம்','Garbage':'குப்பை','Water Leak':'நீர் கசிவு','Streetlight':'தெருவிளக்கு','Operations Map':'செயல்பாட்டு வரைபடம்','Field Crew':'களப் பணியாளர்கள்'
  }
};

Object.assign(extraDictionaries.hi, {
  'AI Alerts': 'एआई अलर्ट', 'Needs Attention': 'ध्यान देना आवश्यक',
  'Important deadlines and work that needs attention': 'महत्वपूर्ण समय-सीमाएं और ध्यान देने योग्य कार्य',
  'Alerts are generated from municipal workflow and SLA data. Review an alert before taking action.': 'अलर्ट नगरपालिका कार्यप्रवाह और SLA डेटा से बनते हैं। कार्रवाई से पहले अलर्ट की समीक्षा करें।',
  'Scanning deadlines and active workflows…': 'समय-सीमाओं और सक्रिय कार्यों की जांच हो रही है…',
  'No unacknowledged urgent alerts. Municipal workflows are being monitored.': 'कोई नया जरूरी अलर्ट नहीं है। नगरपालिका कार्यप्रवाह की निगरानी जारी है।',
  'Collapse alerts': 'अलर्ट समेटें', 'Expand alerts': 'अलर्ट खोलें', 'Suggested action': 'सुझाई गई कार्रवाई',
  'SLA DEADLINE APPROACHING': 'SLA समय-सीमा नजदीक', 'SLA BREACH RISK': 'SLA उल्लंघन का जोखिम',
  'STALLED WORKFLOW': 'रुका हुआ कार्यप्रवाह', 'UNASSIGNED PRIORITY ISSUE': 'बिना आवंटित प्राथमिकता समस्या',
  CRITICAL: 'अति गंभीर', HIGH: 'उच्च', MEDIUM: 'मध्यम', LOW: 'कम',
  SEND_REMINDER: 'अनुस्मारक भेजें', RECOMMEND_ESCALATION: 'मामला आगे बढ़ाएं',
  INCREASE_PRIORITY: 'प्राथमिकता बढ़ाएं', RECOMMEND_REASSIGNMENT: 'पुनः आवंटित करें', 'Review report': 'रिपोर्ट की समीक्षा करें',
  'Saving…': 'सहेजा जा रहा है…', "I've Seen": 'मैंने देख लिया', 'citizen reports': 'नागरिक रिपोर्ट'
});
Object.assign(extraDictionaries.mr, {
  'AI Alerts': 'एआय सूचना', 'Needs Attention': 'लक्ष देणे आवश्यक',
  'Important deadlines and work that needs attention': 'महत्त्वाच्या मुदती आणि लक्ष देण्याची कामे',
  'Alerts are generated from municipal workflow and SLA data. Review an alert before taking action.': 'सूचना महानगरपालिका कामकाज आणि SLA डेटावरून तयार होतात. कृतीपूर्वी सूचनेचा आढावा घ्या.',
  'Scanning deadlines and active workflows…': 'मुदती आणि सुरू असलेल्या कामांची तपासणी सुरू आहे…',
  'No unacknowledged urgent alerts. Municipal workflows are being monitored.': 'न पाहिलेली तातडीची सूचना नाही. महानगरपालिका कामकाजावर देखरेख सुरू आहे.',
  'Collapse alerts': 'सूचना बंद करा', 'Expand alerts': 'सूचना उघडा', 'Suggested action': 'सुचवलेली कृती',
  'SLA DEADLINE APPROACHING': 'SLA मुदत जवळ आली आहे', 'SLA BREACH RISK': 'SLA उल्लंघनाचा धोका',
  'STALLED WORKFLOW': 'कामकाज रखडले आहे', 'UNASSIGNED PRIORITY ISSUE': 'प्राधान्याचे काम वाटप झालेले नाही',
  CRITICAL: 'अत्यंत गंभीर', HIGH: 'उच्च', MEDIUM: 'मध्यम', LOW: 'कमी',
  SEND_REMINDER: 'स्मरणपत्र पाठवा', RECOMMEND_ESCALATION: 'वरिष्ठांकडे पाठवा',
  INCREASE_PRIORITY: 'प्राधान्य वाढवा', RECOMMEND_REASSIGNMENT: 'पुन्हा वाटप करा', 'Review report': 'अहवाल तपासा',
  'Saving…': 'जतन करत आहे…', "I've Seen": 'मी पाहिले', 'citizen reports': 'नागरिकांच्या तक्रारी'
});
Object.assign(extraDictionaries.kn, {
  'AI Alerts': 'AI ಎಚ್ಚರಿಕೆಗಳು', 'Needs Attention': 'ಗಮನ ಅಗತ್ಯ',
  'Important deadlines and work that needs attention': 'ಪ್ರಮುಖ ಗಡುವುಗಳು ಮತ್ತು ಗಮನಿಸಬೇಕಾದ ಕೆಲಸಗಳು',
  'Alerts are generated from municipal workflow and SLA data. Review an alert before taking action.': 'ನಗರಸಭೆಯ ಕಾರ್ಯಪ್ರವಾಹ ಮತ್ತು SLA ಮಾಹಿತಿಯಿಂದ ಎಚ್ಚರಿಕೆಗಳು ಸೃಷ್ಟಿಯಾಗುತ್ತವೆ. ಕ್ರಮಕ್ಕೂ ಮೊದಲು ಪರಿಶೀಲಿಸಿ.',
  'Scanning deadlines and active workflows…': 'ಗಡುವುಗಳು ಮತ್ತು ಸಕ್ರಿಯ ಕಾರ್ಯಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…',
  'No unacknowledged urgent alerts. Municipal workflows are being monitored.': 'ಪರಿಶೀಲಿಸದ ತುರ್ತು ಎಚ್ಚರಿಕೆಗಳಿಲ್ಲ. ನಗರಸಭೆಯ ಕಾರ್ಯಪ್ರವಾಹವನ್ನು ಗಮನಿಸಲಾಗುತ್ತಿದೆ.',
  'Collapse alerts': 'ಎಚ್ಚರಿಕೆಗಳನ್ನು ಮುಚ್ಚಿ', 'Expand alerts': 'ಎಚ್ಚರಿಕೆಗಳನ್ನು ತೆರೆಯಿರಿ', 'Suggested action': 'ಸೂಚಿಸಿದ ಕ್ರಮ',
  'SLA DEADLINE APPROACHING': 'SLA ಗಡುವು ಸಮೀಪಿಸಿದೆ', 'SLA BREACH RISK': 'SLA ಉಲ್ಲಂಘನೆಯ ಅಪಾಯ',
  'STALLED WORKFLOW': 'ಸ್ಥಗಿತಗೊಂಡ ಕಾರ್ಯಪ್ರವಾಹ', 'UNASSIGNED PRIORITY ISSUE': 'ಹಂಚಿಕೆಯಾಗದ ಆದ್ಯತೆಯ ಸಮಸ್ಯೆ',
  CRITICAL: 'ಅತ್ಯಂತ ಗಂಭೀರ', HIGH: 'ಹೆಚ್ಚು', MEDIUM: 'ಮಧ್ಯಮ', LOW: 'ಕಡಿಮೆ',
  SEND_REMINDER: 'ಜ್ಞಾಪನೆ ಕಳುಹಿಸಿ', RECOMMEND_ESCALATION: 'ಮೇಲಧಿಕಾರಿಗೆ ಕಳುಹಿಸಿ',
  INCREASE_PRIORITY: 'ಆದ್ಯತೆ ಹೆಚ್ಚಿಸಿ', RECOMMEND_REASSIGNMENT: 'ಮರುಹಂಚಿಕೆ ಮಾಡಿ', 'Review report': 'ವರದಿ ಪರಿಶೀಲಿಸಿ',
  'Saving…': 'ಉಳಿಸಲಾಗುತ್ತಿದೆ…', "I've Seen": 'ನೋಡಿದ್ದೇನೆ', 'citizen reports': 'ನಾಗರಿಕ ವರದಿಗಳು'
});
Object.assign(extraDictionaries.ta, {
  'AI Alerts': 'AI எச்சரிக்கைகள்', 'Needs Attention': 'கவனம் தேவை',
  'Important deadlines and work that needs attention': 'முக்கிய காலக்கெடுகள் மற்றும் கவனம் தேவைப்படும் பணிகள்',
  'Alerts are generated from municipal workflow and SLA data. Review an alert before taking action.': 'நகராட்சி பணிச்செயல் மற்றும் SLA தரவிலிருந்து எச்சரிக்கைகள் உருவாகின்றன. நடவடிக்கைக்கு முன் மதிப்பாய்வு செய்யவும்.',
  'Scanning deadlines and active workflows…': 'காலக்கெடுகள் மற்றும் செயல்பாட்டிலுள்ள பணிகள் சரிபார்க்கப்படுகின்றன…',
  'No unacknowledged urgent alerts. Municipal workflows are being monitored.': 'கவனிக்கப்படாத அவசர எச்சரிக்கைகள் இல்லை. நகராட்சி பணிகள் கண்காணிக்கப்படுகின்றன.',
  'Collapse alerts': 'எச்சரிக்கைகளைச் சுருக்கவும்', 'Expand alerts': 'எச்சரிக்கைகளை விரிக்கவும்', 'Suggested action': 'பரிந்துரைக்கப்பட்ட நடவடிக்கை',
  'SLA DEADLINE APPROACHING': 'SLA காலக்கெடு நெருங்குகிறது', 'SLA BREACH RISK': 'SLA மீறல் அபாயம்',
  'STALLED WORKFLOW': 'நிறுத்தப்பட்ட பணிச்செயல்', 'UNASSIGNED PRIORITY ISSUE': 'ஒதுக்கப்படாத முன்னுரிமைப் பிரச்சினை',
  CRITICAL: 'மிகவும் அவசரம்', HIGH: 'உயர்', MEDIUM: 'நடுத்தரம்', LOW: 'குறைவு',
  SEND_REMINDER: 'நினைவூட்டல் அனுப்பவும்', RECOMMEND_ESCALATION: 'மேலதிகாரிக்கு அனுப்பவும்',
  INCREASE_PRIORITY: 'முன்னுரிமையை உயர்த்தவும்', RECOMMEND_REASSIGNMENT: 'மறுஒதுக்கீடு செய்யவும்', 'Review report': 'புகாரை மதிப்பாய்வு செய்யவும்',
  'Saving…': 'சேமிக்கப்படுகிறது…', "I've Seen": 'பார்த்துவிட்டேன்', 'citizen reports': 'குடிமக்கள் புகார்கள்'
});

const translationFor = (lang, source) => dictionaries[lang]?.[source] || extraDictionaries[lang]?.[source];
const allTranslations = (lang) => ({ ...dictionaries[lang], ...extraDictionaries[lang] });

const LanguageContext = createContext(null);
const supported = ['en', 'hi', 'mr', 'kn', 'ta'];
const attrNames = ['placeholder', 'title', 'aria-label'];

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem('seva-language');
    return supported.includes(saved) ? saved : 'en';
  });
  const setLanguage = useCallback((value) => {
    if (!supported.includes(value)) return;
    localStorage.setItem('seva-language', value);
    setLanguageState(value);
  }, []);
  const t = useCallback((value) => translationFor(language, value) || value, [language]);

  useEffect(() => {
    document.documentElement.lang = language;
    const translate = (root) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const raw = node.nodeValue;
        const trim = raw.trim();
        if (!trim) continue;
        const canonical = Object.keys(dictionaries).reduce((found, lang) => found || Object.entries(allTranslations(lang)).find(([, translated]) => translated === trim)?.[0], null) || trim;
        if (language === 'en') {
          if (canonical !== trim) node.nodeValue = raw.replace(trim, canonical);
        } else {
          const localized = translationFor(language, canonical);
          if (localized) node.nodeValue = raw.replace(trim, localized);
        }
      }
      if (root.nodeType === Node.ELEMENT_NODE || root === document) {
        const elements = root.querySelectorAll ? [root, ...root.querySelectorAll('*')] : [];
        elements.forEach((el) => attrNames.forEach((attr) => {
          const value = el.getAttribute?.(attr);
          if (!value) return;
          const canonical = Object.keys(dictionaries).reduce((found, lang) => found || Object.entries(allTranslations(lang)).find(([, translated]) => translated === value)?.[0], null) || value;
          const localized = translationFor(language, canonical);
          if (localized) el.setAttribute(attr, localized);
          else if (language === 'en' && canonical !== value) el.setAttribute(attr, canonical);
        }));
      }
    };
    translate(document.body);
    const observer = new MutationObserver((mutations) => mutations.forEach((mutation) => {
      if (mutation.type === 'characterData') translate(mutation.target.parentElement || document.body);
      else mutation.addedNodes.forEach((node) => { if (node.nodeType === Node.ELEMENT_NODE) translate(node); });
    }));
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, t, languages: [
    { code: 'en', name: 'English' }, { code: 'hi', name: 'हिन्दी' }, { code: 'mr', name: 'मराठी' }, { code: 'kn', name: 'ಕನ್ನಡ' }, { code: 'ta', name: 'தமிழ்' }
  ] }), [language, setLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider');
  return value;
};
