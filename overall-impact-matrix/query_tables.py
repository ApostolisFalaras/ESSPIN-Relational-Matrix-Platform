import pandas as pd

# Function that queries the Estimated Inputs table
def query_table(cursor, source, level_of_analysis, dependent, independent):
    
    # Determining if the dependent variable is actually a set of related variables separated by -
    if dependent.startswith("Size of Public sector") or dependent.startswith("Adequate transportation infrastructure") or \
    dependent.startswith("Level of development") or dependent.startswith("Discrimination with respect to race"):
        dependent = dependent.split(" - ")
    else:
        dependent = [dependent]
        
    # Determining if the independent variable is actually a set of related variables separated by -
    if independent.startswith("Size of Public sector") or independent.startswith("Adequate transportation infrastructure") or \
    independent.startswith("Level of development") or independent.startswith("Discrimination with respect to race"):
        independent = independent.split(" - ")
    else:
        independent = [independent]
       
    df = None
    
    # Estimated or Literature or Perceived Inputs
    if source == "estimated" or source == "literature" or source == "perceived":
        
        if level_of_analysis == "All Levels":
            results = []
            
            levels = ["National (compare countries)", "Regional (compare regions or areas)", "Survey (compare individuals or social groups)", "Case Study (in depth analysis)", "Other"]
            for level in levels:
                query = f"""SELECT * 
                FROM {source}_inputs
                WHERE level_of_analysis = %s AND selection_dependent = %s AND selection_independent = %s;"""
            
                cursor.execute(query, (level, dependent[0], independent[0]))
                rows = cursor.fetchall()
                results.extend(rows)
            
            df = pd.DataFrame(results)
            
            if (len(df) > 0):
                print(f"{source.capitalize()} Inputs:", end=" ")
                for _,row in df.iterrows():
                    print(row["id"], end=" ")
                
                print()
                
        else:
            query = f"""SELECT * 
                FROM {source}_inputs 
                WHERE level_of_analysis = %s AND selection_dependent = %s AND selection_independent = %s;"""
            
            cursor.execute(query, (level_of_analysis, dependent[0], independent[0]))
            rows = cursor.fetchall()
            df = pd.DataFrame(rows)
        
            if (len(df) > 0):
                print(f"{source.capitalize()} Inputs:", end=" ")
                for _,row in df.iterrows():
                    print(row["id"], end=" ")
                
                print()
    
    # Correlations
    elif source == "correlations":
        correlations = []
    
        for dep in dependent:
            for ind in independent:
                
                cursor.execute("""SELECT *
                        FROM correlations 
                        WHERE dependent_variable = %s AND independent_variable = %s;""", (dep, ind))
                
                rows = cursor.fetchall()
                
                if (len(rows) == 0):
                    cursor.execute("""SELECT *
                                    FROM correlations
                                    WHERE dependent_variable = %s AND independent_variable = %s;""", (ind, dep))
                    rows = cursor.fetchall()
                    
                if (len(rows) > 0):
                    
                    # '10' is an arbitrary placeholder value for a missing correlation value
                    for row in rows:
                        if row["correlation_2000"] == 10: row["correlation_2000"] = "-"
                        if row["correlation_2023"] == 10: row["correlation_2023"] = "-"
                    correlations.extend(rows)
        
        df = pd.DataFrame(correlations)
        
        if (len(df) > 0):
            print("Correlation Inputs:", end=" ")
            for _,row in df.iterrows():
                print(row["id"], end=" ")
            
            print()
        
    
    # Granger Causalities
    elif source == "granger_causalities":
        causalities = []
    
        for dep in dependent:
            for ind in independent:
                
                cursor.execute("""SELECT *
                                FROM granger_causalities
                                WHERE dependent_variable = %s AND independent_variable = %s""", (dep, ind))
                rows = cursor.fetchall()
                
                if (len(rows) > 0):
                    causalities.extend(rows)
        
        df = pd.DataFrame(causalities)
        
        if (len(df) > 0):
            print("Granger Causalities Inputs:", end=" ")
            for _,row in df.iterrows():
                print(row["id"], end=" ")
            
            print()
            
    # AI (ChatGPT) Research
    elif source == "ai_chatgpt_research":
        if level_of_analysis == "All Levels":
            results = []
            
            levels = ["National (compare countries)", "Regional (compare regions or areas)"]
            for level in levels:
                query = f"""SELECT * 
                FROM {source}
                WHERE level_of_analysis = %s AND selection_dependent = %s AND selection_independent = %s;"""
            
                cursor.execute(query, (level, dependent[0], independent[0]))
                rows = cursor.fetchall()
                results.extend(rows)
            
            df = pd.DataFrame(results)
            
            if (len(df) > 0):
                print(f"{source.capitalize()}:", end=" ")
                for _,row in df.iterrows():
                    print(row["id"], end=" ")
                
                print()
                
        else:
            query = f"""SELECT * 
                FROM {source} 
                WHERE level_of_analysis = %s AND selection_dependent = %s AND selection_independent = %s;"""
            
            cursor.execute(query, (level_of_analysis, dependent[0], independent[0]))
            rows = cursor.fetchall()
            df = pd.DataFrame(rows)
        
            if (len(df) > 0):
                print(f"{source.capitalize()} Inputs:", end=" ")
                for _,row in df.iterrows():
                    print(row["id"], end=" ")
                
                print()
        
    return df