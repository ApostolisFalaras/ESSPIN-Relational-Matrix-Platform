from openpyxl.utils import column_index_from_string, get_column_letter

# Sets up the header row and header column, 
# by populating with the variable names and styling the columns
def setup_matrix_structure(sheet, variables):
    sheet.clear()
    
    start_col = column_index_from_string("C")
    header_row = 2
    row_header_col = "B"
    data_start_row = 3
    
    sheet.range("B2").value = ""
    
    # Populating header row with variable names, defining styles, and text placement
    for col_index, variable in enumerate(variables):
        col_letter = get_column_letter(start_col + col_index)
        cell = sheet.range(f"{col_letter}{header_row}")
        cell.value = variable
        cell.color = (218, 233, 248)
        cell.font.bold = True
        cell.api.WrapText = True
        cell.api.HorizontalAlignment = -4108
        cell.api.VerticalAlignment = -4108
        
    # Populating header column with variable names, defining styles, and text placement
    for row_index, variable in enumerate(variables):
        row_number = data_start_row + row_index
        cell = sheet.range(f"{row_header_col}{row_number}")
        cell.value = variable
        cell.color = (252, 228, 214)
        cell.font.bold = True
        cell.api.WrapText = True
        cell.api.HorizontalAlignment = -4108
        cell.api.VerticalAlignment = -4108
        
    last_col = get_column_letter(start_col + len(variables) - 1)
    last_row = data_start_row + len(variables) - 1
    
    # Style matrix grid lines 
    full_range = sheet.range(f"{row_header_col}{header_row}:{last_col}{last_row}")
    full_range.api.Borders.LineStyle = 1
    full_range.api.Borders.Weight = 2
    
    # Apply thick black borders to all cells
    for border_id in range(7, 13):
        border = full_range.api.Borders(border_id)
        border.LineStyle = 1
        border.Weight = 3
    
    # Defining column widths
    sheet.range("B:B").column_width = 18
    
    for col_index in range(len(variables)):
        col_letter = get_column_letter(start_col + col_index)
        sheet.range(f"{col_letter}:{col_letter}").column_width = 14
    
    header_range = sheet.range(f"C2:{last_col}2")

    header_range.api.WrapText = True
    header_range.api.HorizontalAlignment = -4108
    header_range.api.VerticalAlignment = -4108

    # Let Excel adjust row height automatically
    sheet.range("2:2").api.Rows.AutoFit()

    if sheet.range("2:2").row_height < 85:
        sheet.range("2:2").row_height = 85
        
    # Make the row & column headers freeze when scrolling vertically & horizontally
    sheet.activate()
    sheet.api.Application.ActiveWindow.SplitColumn = 2
    sheet.api.Application.ActiveWindow.SplitRow = 2
    sheet.api.Application.ActiveWindow.FreezePanes = True
    

# Centers the percentage values horizontally and vertically 
def format_matrix_body(sheet, variables):
    last_col = get_column_letter(column_index_from_string("C") + len(variables) - 1)
    last_row = 3 + len(variables) - 1

    body_range = sheet.range(f"C3:{last_col}{last_row}")

    # Center values after assigning values to the corresponding cells
    body_range.api.HorizontalAlignment = -4108  
    body_range.api.VerticalAlignment = -4108  
    
    body_range.api.WrapText = True
    body_range.api.ShrinkToFit = True