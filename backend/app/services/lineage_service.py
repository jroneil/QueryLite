"""
Lineage Service - Extract and track data lineage from SQL queries

Parses SQL to identify referenced tables and columns, then stores
relationships to saved queries and dashboard panels.
"""

import re
from typing import List, Dict, Any, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.db.models import DataLineageEdge, SavedQuery, DashboardPanel


def extract_tables_from_sql(sql: str) -> List[str]:
    """
    Extract table names from a SQL query using regex.
    
    This is a simplified parser that handles common cases:
    - FROM table_name
    - JOIN table_name
    - table_name.column_name
    """
    tables = set()
    
    # Normalize whitespace
    sql_normalized = re.sub(r'\s+', ' ', sql.upper())
    
    # Match FROM and JOIN clauses
    from_pattern = r'(?:FROM|JOIN)\s+([A-Z_][A-Z0-9_]*)'
    matches = re.findall(from_pattern, sql_normalized)
    tables.update(m.lower() for m in matches)
    
    # Match table.column patterns
    table_col_pattern = r'([A-Z_][A-Z0-9_]*)\.([A-Z_][A-Z0-9_]*)'
    matches = re.findall(table_col_pattern, sql_normalized)
    for table, _ in matches:
        tables.add(table.lower())
    
    return list(tables)


def extract_columns_from_sql(sql: str) -> List[Dict[str, str]]:
    """
    Extract table.column references from a SQL query.
    
    Returns a list of dicts with 'table' and 'column' keys.
    """
    columns = []
    sql_normalized = re.sub(r'\s+', ' ', sql.upper())
    
    # Match table.column patterns
    table_col_pattern = r'([A-Z_][A-Z0-9_]*)\.([A-Z_][A-Z0-9_]*)'
    matches = re.findall(table_col_pattern, sql_normalized)
    
    seen = set()
    for table, column in matches:
        key = f"{table.lower()}.{column.lower()}"
        if key not in seen:
            columns.append({"table": table.lower(), "column": column.lower()})
            seen.add(key)
    
    return columns


class LineageService:
    """Service for managing data lineage tracking"""
    
    @staticmethod
    def record_query_lineage(
        db: Session,
        data_source_id: UUID,
        sql_query: str,
        saved_query_id: UUID
    ) -> List[DataLineageEdge]:
        """
        Parse a SQL query and record lineage edges for all referenced tables.
        """
        tables = extract_tables_from_sql(sql_query)
        edges = []
        
        for table in tables:
            # Check if edge already exists
            existing = db.query(DataLineageEdge).filter(
                DataLineageEdge.data_source_id == data_source_id,
                DataLineageEdge.source_type == "table",
                DataLineageEdge.source_name == table,
                DataLineageEdge.target_type == "saved_query",
                DataLineageEdge.target_id == saved_query_id
            ).first()
            
            if not existing:
                edge = DataLineageEdge(
                    data_source_id=data_source_id,
                    source_type="table",
                    source_name=table,
                    target_type="saved_query",
                    target_id=saved_query_id
                )
                db.add(edge)
                edges.append(edge)
        
        db.commit()
        return edges
    
    @staticmethod
    def get_lineage_graph(
        db: Session,
        data_source_id: UUID
    ) -> Dict[str, Any]:
        """
        Return a graph representation of all lineage for a data source.
        
        Returns nodes (tables, queries, panels) and edges between them.
        """
        edges = db.query(DataLineageEdge).filter(
            DataLineageEdge.data_source_id == data_source_id
        ).all()
        
        nodes = {}
        links = []
        
        for edge in edges:
            # Add source node
            source_key = f"{edge.source_type}:{edge.source_name}"
            if source_key not in nodes:
                nodes[source_key] = {
                    "id": source_key,
                    "type": edge.source_type,
                    "name": edge.source_name
                }
            
            # Add target node
            target_key = f"{edge.target_type}:{edge.target_id}"
            if target_key not in nodes:
                # Fetch target name
                target_name = str(edge.target_id)
                if edge.target_type == "saved_query":
                    sq = db.query(SavedQuery).filter(SavedQuery.id == edge.target_id).first()
                    if sq:
                        target_name = sq.name
                elif edge.target_type == "dashboard_panel":
                    panel = db.query(DashboardPanel).filter(DashboardPanel.id == edge.target_id).first()
                    if panel:
                        target_name = panel.title_override or f"Panel {panel.id}"
                
                nodes[target_key] = {
                    "id": target_key,
                    "type": edge.target_type,
                    "name": target_name,
                    "uuid": str(edge.target_id)
                }
            
            links.append({
                "source": source_key,
                "target": target_key
            })
        
        return {
            "nodes": list(nodes.values()),
            "links": links
        }
    
    @staticmethod
    def get_impact_analysis(
        db: Session,
        data_source_id: UUID,
        table_name: str
    ) -> Dict[str, Any]:
        """
        Return all saved queries and dashboard panels that reference a given table.
        
        Useful for assessing impact of schema changes.
        """
        edges = db.query(DataLineageEdge).filter(
            DataLineageEdge.data_source_id == data_source_id,
            DataLineageEdge.source_type == "table",
            DataLineageEdge.source_name == table_name.lower()
        ).all()
        
        affected_queries = []
        affected_panels = []
        
        for edge in edges:
            if edge.target_type == "saved_query":
                sq = db.query(SavedQuery).filter(SavedQuery.id == edge.target_id).first()
                if sq:
                    affected_queries.append({
                        "id": str(sq.id),
                        "name": sq.name,
                        "query": sq.natural_language_query
                    })
            elif edge.target_type == "dashboard_panel":
                panel = db.query(DashboardPanel).filter(DashboardPanel.id == edge.target_id).first()
                if panel:
                    affected_panels.append({
                        "id": str(panel.id),
                        "dashboard_id": str(panel.dashboard_id),
                        "title": panel.title_override
                    })
        
        return {
            "table": table_name,
            "affected_queries": affected_queries,
            "affected_panels": affected_panels,
            "total_impact": len(affected_queries) + len(affected_panels)
        }
