import psycopg2
from psycopg2.extras import RealDictCursor
import xlwings as xw
from openpyxl.utils import column_index_from_string, get_column_letter
from dotenv import load_dotenv
import os
from setup_matrix_structure import setup_matrix_structure, format_matrix_body
from query_tables import query_table
from findings_impact_utils import calculate_findings, calculate_impact, calculate_overall_impact
from variables import VARIABLES

load_dotenv()

def query_esspin(cursor, level_of_analysis, dependent, independent, sheet, col_index, row_index):
    # Lists that store the number of findings per category. Each position in the list
    # corresponds to a data source:
    # 0 -> Estimated, 1 -> Literature, 2 -> Perceived, 3 -> Correlations, 4 -> Granger Causalities, 5 -> AI Research
    positive_findings = [0, 0, 0, 0, 0, 0]
    negative_findings = [0, 0, 0, 0, 0, 0]
    inconclusive_findings = [0, 0, 0, 0, 0, 0]
    noeffect_findings = [0, 0, 0, 0, 0, 0]

    findings = {
        "positive_findings": positive_findings,
        "negative_findings": negative_findings,
        "inconclusive_findings": inconclusive_findings,
        "noeffect_findings": noeffect_findings
    }

    sources = ["Estimated", "Literature", "Perceived", "Correlations", "Granger Causalities"]

    # Querying the 5 Input Tables in the database
    estimated_df = query_table(cursor, "estimated", level_of_analysis, dependent, independent)
    literature_df = query_table(cursor, "literature", level_of_analysis, dependent, independent)
    perceived_df = query_table(cursor, "perceived", level_of_analysis, dependent, independent)
    correlation_df = query_table(cursor, "correlations", level_of_analysis, dependent, independent)
    causalities_df = query_table(cursor, "granger_causalities", level_of_analysis, dependent, independent)
    
    results_data = [estimated_df, literature_df, perceived_df, correlation_df, causalities_df]
    
    # Unequal Income distribution also comes with data from ChatGPT prompts
    if dependent == "Unequal Income distribution (individuals or social groups)" and level_of_analysis in ["National (compare countries)", "Regional (compare regions or areas)", "All Levels"]:
        chatgpt_df = query_table(cursor, "ai_chatgpt_research", level_of_analysis, dependent, independent)
        sources.append("AI (ChatGPT) Research")
        results_data.append(chatgpt_df)

    
    # Calculating the various types of findings across all 5 data sources
    for source, data in zip(sources, results_data):
        if (len(data) > 0):
            calculate_findings(source, data, **findings)

    print("\nPositive Findings:", positive_findings)
    print("Negative Findings:", negative_findings)
    print("Inconclusive Findings:", inconclusive_findings)
    print("No Effect Findings:", noeffect_findings)

    impacts = [None, None, None, None, None, None]

    for index, source in enumerate(sources):
        impacts[index] = calculate_impact(source, **findings)
        

    print()
    print(f"Estimated: {positive_findings[0] + negative_findings[0] + inconclusive_findings[0] + noeffect_findings[0]} (", end="")
    print(f"Positive - {positive_findings[0]}, Negative - {negative_findings[0]}, Inconclusive - {inconclusive_findings[0]}, No-Effect - {noeffect_findings[0]})")
    
    print(f"Literature: {positive_findings[1] + negative_findings[1] + inconclusive_findings[1] + noeffect_findings[1]} (", end="")
    print(f"Positive - {positive_findings[1]}, Negative - {negative_findings[1]}, Inconclusive - {inconclusive_findings[1]}, No-Effect - {noeffect_findings[1]})")
    
    print(f"Perceived: {positive_findings[2] + negative_findings[2] + inconclusive_findings[2] + noeffect_findings[2]} (", end="")
    print(f"Positive - {positive_findings[2]}, Negative - {negative_findings[2]}, Inconclusive - {inconclusive_findings[2]}, No-Effect - {noeffect_findings[2]})")
    
    print(f"Correlations: {positive_findings[3] + negative_findings[3] + inconclusive_findings[3] + noeffect_findings[3]} (", end="")
    print(f"Positive - {positive_findings[3]}, Negative - {negative_findings[3]}, Inconclusive - {inconclusive_findings[3]}, No-Effect - {noeffect_findings[3]})")
    
    print(f"Granger Causalities: {positive_findings[4] + negative_findings[4] + inconclusive_findings[4] + noeffect_findings[4]} (", end="")
    print(f"Positive - {positive_findings[4]}, Negative - {negative_findings[4]}, Inconclusive - {inconclusive_findings[4]}, No-Effect - {noeffect_findings[4]})")
    
    print(f"AI (ChatGPT) Research: {positive_findings[5] + negative_findings[5] + inconclusive_findings[5] + noeffect_findings[5]} (", end="")
    print(f"Positive - {positive_findings[5]}, Negative - {negative_findings[5]}, Inconclusive - {inconclusive_findings[5]}, No-Effect - {noeffect_findings[5]})")
    
    print("\nEstimated Impact:", impacts[0])
    print("Literature Impact:", impacts[1])
    print("Perceived Impact:", impacts[2])
    print("Correlations Impact:", impacts[3])
    print("Granger Causalities Impact:", impacts[4])
    print("AI (ChatGPT) Research:", impacts[5])

    overall_impact, percentage, confidence = calculate_overall_impact(**findings)

    print(f"Overall Impact: {overall_impact}\nPercentage: {percentage}\nConfidence: {confidence}")
    
    
    row = 3 + row_index
    column = get_column_letter(column_index_from_string("C") + col_index)
    
    # FORMATTING OF EXCEL CELLS BASED ON EACH QUERY RESULT
    
    sheet.range(f"{column}{row}").value = percentage
    
    match (overall_impact):
        case "Positive": sheet.range(f"{column}{row}").color = (90, 161, 94)
        case "Negative": sheet.range(f"{column}{row}").color = (231, 106, 106)
        case "Inconclusive": sheet.range(f"{column}{row}").color = (255, 235, 102)
        case "No Effect": sheet.range(f"{column}{row}").color = (176, 176, 176)
        
    match (confidence):
        case "Very High": 
            val = sheet.range(f"{column}{row}").value
            sheet.range(f"{column}{row}").value = f"{val * 100:.1f} % ****"
        case "High":
            val = sheet.range(f"{column}{row}").value
            sheet.range(f"{column}{row}").value = f"{val * 100:.1f} % ***"
        case "Modest": 
            val = sheet.range(f"{column}{row}").value
            sheet.range(f"{column}{row}").value = f"{val * 100:.1f} % **"
        case "Low": 
            val = sheet.range(f"{column}{row}").value
            sheet.range(f"{column}{row}").value = f"{val * 100:.1f} % *"
        
    

# ---------- MAIN STARTING POINT FUNCTION ------------

def main():
    try: 
        level_of_analysis = "All Levels"

        # Establishing a connection to the database
        cnx = psycopg2.connect(
            host=os.getenv("DB_HOST"), 
            user=os.getenv("DB_USER"), 
            database=os.getenv("DB_NAME"), 
            password=os.getenv("DB_PASSWORD"),
            port=os.getenv("DB_PORT")
        )
        
        print("Database connection is open.")
        
        cursor = cnx.cursor(cursor_factory=RealDictCursor)

        book = xw.Book()
        sheet = book.sheets[0]
        sheet.name = "Overall-Impact-All-Variables"

        # Define excel matrix structure before populating it with values
        setup_matrix_structure(sheet, VARIABLES)

        for col, dep in enumerate(VARIABLES):
            for row, ind in enumerate(VARIABLES):
                
                print("-"*100, "\nQuery:\n")
                print(f"Level of Analysis = {level_of_analysis},\nDependent Variable = {dep},\nIndependent Variable = {ind}\n")
                
                query_esspin(cursor, level_of_analysis, dep, ind, sheet, col, row)
                
        # Align values inside cells
        format_matrix_body(sheet, VARIABLES)

    except Exception:
        # Rolling the transaction back if anything fails
        # Although try-except is temporary due to only select statements being executed
        # It's added for completeness
        if cnx:
            cnx.rollback()
            print("Creation of overall impact matrix failed.")
    finally:
        if cursor:
            cursor.close()
        if cnx:
            cnx.close()
        print("Database connection closed.")

    book.save("overall_impact_matrices.xlsx")
    book.close()
    cursor.close()
    cnx.close()

if __name__ == "__main__":
    main()