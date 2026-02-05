import re
from typing import List

from sqlalchemy import inspect

from app.models.schema_models import EnhancedColumn, EnhancedTable, TableRelationship


class SchemaAnalyzer:
    """Service for advanced database schema analysis"""
    
    def __init__(self, engine):
        self.engine = engine
        self.inspector = inspect(engine)
        
    def detect_relationships(self) -> List[TableRelationship]:
        """Detect foreign key relationships across all tables"""
        relationships = []
        tables = self.inspector.get_table_names()
        
        for table in tables:
            fks = self.inspector.get_foreign_keys(table)
            for fk in fks:
                for i, col in enumerate(fk['constrained_columns']):
                    relationships.append(TableRelationship(
                        from_table=table,
                        from_column=col,
                        to_table=fk['referred_table'],
                        to_column=fk['referred_columns'][i]
                    ))
                    
        # Also try to infer naming-based relationships (e.g. user_id -> users.id)
        # This is more complex and could be added later
        return relationships

    def infer_column_type(self, column_name: str, data_type: str) -> str:
        """Infer advanced semantic type for a column"""
        col_lower = column_name.lower()
        if re.search(r'email', col_lower):
            return "email"
        if re.search(r'url|website|link', col_lower):
            return "url"
        if re.search(r'phone|mobile|tel', col_lower):
            return "phone"
        if re.search(r'lat|latitude', col_lower):
            return "latitude"
        if re.search(r'lng|longitude|lon', col_lower):
            return "longitude"
        if re.search(r'price|amount|cost|revenue|salary', col_lower):
            return "monetary"
        if re.search(r'created|updated|deleted|timestamp|at$', col_lower):
            return "timestamp"
        return data_type

    def get_enhanced_schema(self) -> List[EnhancedTable]:
        """Get full enhanced schema information"""
        enhanced_tables = []
        tables = self.inspector.get_table_names()
        all_relationships = self.detect_relationships()
        
        for table_name in tables:
            columns = self.inspector.get_columns(table_name)
            pk_columns = self.inspector.get_pk_constraint(table_name).get('constrained_columns', [])
            
            table_relationships = [r for r in all_relationships if r.from_table == table_name]
            fk_columns = [r.from_column for r in table_relationships]
            
            enhanced_columns = []
            for col in columns:
                inferred = self.infer_column_type(col['name'], str(col['type']))
                enhanced_columns.append(EnhancedColumn(
                    name=col['name'],
                    data_type=str(col['type']),
                    is_nullable=col.get('nullable', True),
                    is_primary_key=col['name'] in pk_columns,
                    is_foreign_key=col['name'] in fk_columns,
                    inferred_type=inferred
                ))
                
            enhanced_tables.append(EnhancedTable(
                name=table_name,
                columns=enhanced_columns,
                relationships=table_relationships
            ))
            
        return enhanced_tables

    def get_formatted_schema_for_llm(self) -> str:
        """Get schema info optimized for LLM consumption"""
        tables = self.get_enhanced_schema()
        schema_parts = []
        
        for table in tables:
            col_lines = []
            for col in table.columns:
                line = f"  - {col.name}: {col.data_type}"
                if col.inferred_type and col.inferred_type != col.data_type:
                    line += f" (semantic: {col.inferred_type})"
                if col.is_primary_key:
                    line += " [PK]"
                if col.is_foreign_key:
                    line += " [FK]"
                col_lines.append(line)
            
            table_str = f"Table: {table.name}\nColumns:\n" + "\n".join(col_lines)
            
            if table.relationships:
                rel_lines = []
                for rel in table.relationships:
                    rel_lines.append(f"  - {rel.from_column} -> {rel.to_table}.{rel.to_column}")
                table_str += "\nRelationships:\n" + "\n".join(rel_lines)
                
            schema_parts.append(table_str)
            
        return "\n\n".join(schema_parts)
