from functools import reduce

# Function that calculates the impact of the findings based on their effect direction
def calculate_findings(source, findings, positive_findings, negative_findings, inconclusive_findings, noeffect_findings):
    
    index = -1
    match(source):
        case "Estimated": index = 0
        case "Literature": index = 1
        case "Perceived": index = 2
        case "Correlations": index = 3
        case "Granger Causalities": index = 4
        case "AI (ChatGPT) Research": index = 5
        case _: 
            print("Invalid Input Source")
            return
    
    if index == 0 or index == 1 or index == 2 or index == 5:
        for _, finding in findings.iterrows():
            
            if finding["effect_direction"] == "Increases" or finding["effect_direction"] == "Increase": 
                positive_findings[index] += 1
                
                if index == 0 or index == 1 or index == 2:
                    if finding["type_of_condition_effect"] == "Makes increase weaker. After some point impact becomes negative":
                        negative_findings[index] += 1
                
            elif finding["effect_direction"] == "Decreases": 
                negative_findings[index] += 1
                
                if index == 0 or index == 1 or index == 2:
                    if finding["type_of_condition_effect"] == "Makes decrease weaker. After some point impact becomes positive":
                        positive_findings[index] += 1 
                
            elif finding["effect_direction"] == "Inconclusive effect": inconclusive_findings[index] += 1
                
            elif finding["effect_direction"] == "No effect": noeffect_findings[index] += 1
                
            elif finding["effect_direction"] == "Increases under a conditionality":
                positive_findings[index] += 1
                
                if index == 0 or index == 1 or index == 2:
                    if finding["type_of_condition_effect"] == "Makes increase weaker. After some point impact becomes negative":
                        negative_findings[index] += 1
                    
            elif finding["effect_direction"] == "Decreases under a conditionality":
                negative_findings[index] += 1
                
                if index == 0 or index == 1 or index == 2:
                    if finding["type_of_condition_effect"] == "Makes decrease weaker. After some point impact becomes positive":
                        positive_findings[index] += 1 
                    
            elif finding["effect_direction"] == "First increases and after some point decreases":
                positive_findings[index] += 1
                negative_findings[index] += 1
                
            elif finding["effect_direction"] == "First decreases and after some point increases":
                positive_findings[index] += 1
                negative_findings[index] += 1
                
    elif index == 3:
        for _, finding in findings.iterrows():
            if finding["correlation_2000"] != "-":
                if finding["correlation_2000"] > 0: positive_findings[index] += 1
                elif finding["correlation_2000"] < 0: negative_findings[index] += 1
                else: noeffect_findings[index] += 1
            
            if finding["correlation_2023"] != "-":
                if finding["correlation_2023"] > 0: positive_findings[index] += 1
                elif finding["correlation_2023"] < 0: negative_findings[index] += 1
                else: noeffect_findings[index] += 1
        
    elif index == 4:
        for _, finding in findings.iterrows():
            if finding["causality"] == "Consistent positive" or finding["causality"] == "Predominantly positive":
                positive_findings[index] += 1
            elif finding["causality"] == "Consistent negative" or finding["causality"] == "Predominantly negative":
                negative_findings[index] += 1
            elif finding["causality"] == "Mixed trend":
                inconclusive_findings[index] += 1
        

# Function that calculates the overall impact of the findings in a single data source
def calculate_impact(source, positive_findings, negative_findings, inconclusive_findings, noeffect_findings):

    index = -1
    match(source):
        case "Estimated": index = 0
        case "Literature": index = 1
        case "Perceived": index = 2
        case "Correlations": index = 3
        case "Granger Causalities": index = 4
        case "AI (ChatGPT) Research": index = 5
        case _: 
            print("Invalid Input Source")
            return
    
    impact = None
            
        
    positive = positive_findings[index]
    negative = negative_findings[index]
    inconclusive = inconclusive_findings[index]
    noeffect = noeffect_findings[index]
        
    if positive == 0 and negative == 0 and inconclusive == 0 and noeffect == 0: impact = "-"
    elif negative == 0 and inconclusive == 0 and noeffect == 0: impact = "positive"
    elif positive == 0 and inconclusive == 0 and noeffect == 0: impact = "negative"
    elif positive == 0 and negative == 0 and noeffect == 0: impact = "inconclusive"
    elif positive == 0 and negative == 0 and inconclusive == 0: impact = "noeffect"
    elif positive > 0.65 * (positive + negative + inconclusive + noeffect): impact = "rather-positive"
    elif negative > 0.65 * (positive + negative + inconclusive + noeffect): impact = "rather-negative"
    elif inconclusive > 0.65 * (positive + negative + inconclusive + noeffect): impact = "possibly-inconclusive"
    elif noeffect > 0.65 * (positive + negative + inconclusive + noeffect): impact = "possibly-no-effect"
    else: impact = "inconclusive"
    
    return impact
    

# Function that calculates the overall impact of all findings across all 5 data sources
def calculate_overall_impact(positive_findings, negative_findings, inconclusive_findings, noeffect_findings):
    
    positive = reduce(lambda x,y: x + y, positive_findings)
    negative = reduce(lambda x,y: x + y, negative_findings)
    inconclusive = reduce(lambda x,y: x + y, inconclusive_findings)
    noeffect = reduce(lambda x,y: x + y, noeffect_findings)
    
    print(positive, negative, inconclusive, noeffect)  
    
    impact = None
    percentage = None
    confidence = None
    
    if positive == 0 and negative == 0 and inconclusive == 0 and noeffect == 0: 
        impact = "-" 
        percentage = "0%" 
        confidence = "-"
    elif positive >= 0.90 * (positive + negative + inconclusive + noeffect): 
        impact = "Positive"
        percentage = str(round((positive / (positive + negative + inconclusive + noeffect))*100,1)) + "%" 
        confidence = "Very High"
    elif negative >= 0.90 * (positive + negative + inconclusive + noeffect):
        impact = "Negative"
        percentage = str(round((negative / (positive + negative + inconclusive + noeffect))*100,1)) + "%" 
        confidence = "Very High"
    elif inconclusive >= 0.90 * (positive + negative + inconclusive + noeffect):
        impact = "Inconclusive"
        percentage = str(round((inconclusive / (positive + negative + inconclusive + noeffect))*100,1)) + "%" 
        confidence = "Very High"
    elif noeffect >= 0.90 * (positive + negative + inconclusive + noeffect):
        impact = "No Effect"
        percentage = str(round((noeffect / (positive + negative + inconclusive + noeffect))*100,1)) + "%" 
        confidence = "Very High"
    elif positive >= 0.75 * (positive + negative + inconclusive + noeffect):
        impact = "Positive"
        percentage = str(round((positive / (positive + negative + inconclusive + noeffect))*100,1)) + "%" 
        confidence = "High"
    elif negative >= 0.75 * (positive + negative + inconclusive + noeffect):
        impact = "Negative"
        percentage = str(round((negative / (positive + negative + inconclusive + noeffect))*100,1)) + "%" 
        confidence = "High"
    elif inconclusive >= 0.75 * (positive + negative + inconclusive + noeffect):
        impact = "Inconclusive"
        percentage = str(round((inconclusive / (positive + negative + inconclusive + noeffect))*100,1)) + "%" 
        confidence = "High"
    elif noeffect >= 0.75 * (positive + negative + inconclusive + noeffect):
        impact = "No Effect"
        percentage = str(round((noeffect / (positive + negative + inconclusive + noeffect))*100,1)) + "%" 
        confidence = "High"
    elif positive >= 0.50 * (positive + negative + inconclusive + noeffect):
        if positive == negative:
            impact = "Inconclusive"
        else:
            impact = "Positive"
            
        percentage = str(round((positive / (positive + negative + inconclusive + noeffect))*100,1)) + "%" 
        confidence = "Modest"
    elif negative >= 0.50 * (positive + negative + inconclusive + noeffect):
        impact = "Negative"
        percentage = str(round((negative / (positive + negative + inconclusive + noeffect))*100,1)) + "%" 
        confidence = "Modest"
    elif inconclusive >= 0.50 * (positive + negative + inconclusive + noeffect):
        impact = "Inconclusive"
        percentage = str(round((inconclusive / (positive + negative + inconclusive + noeffect))*100,1)) + "%" 
        confidence = "Modest"
    elif noeffect >= 0.50 * (positive + negative + inconclusive + noeffect):
        impact = "No Effect"
        percentage = str(round((noeffect / (positive + negative + inconclusive + noeffect))*100,1)) + "%" 
        confidence = "Modest"
    else:
        if positive >= negative and positive >= inconclusive and positive >= noeffect:
            if positive == negative:
                impact = "Inconclusive"
            else:
                impact = "Positive"
                
            percentage = str(round((positive / (positive + negative + inconclusive + noeffect))*100,1)) + "%"
        elif negative >= positive and negative >= inconclusive and negative >= noeffect:
            impact = "Negative"
            percentage = str(round((negative / (positive + negative + inconclusive + noeffect))*100,1)) + "%"
        elif inconclusive >= positive and inconclusive >= negative and inconclusive >= noeffect:
            impact = "Inconclusive"
            percentage = str(round((inconclusive / (positive + negative + inconclusive + noeffect))*100,1)) + "%"
        else:
            impact = "No Effect"
            percentage = str(round((noeffect / (positive + negative + inconclusive + noeffect))*100,1)) + "%"

        confidence = "Low"
    
    return impact, percentage, confidence