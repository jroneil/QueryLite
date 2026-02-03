# Test Plan: Pagila Database Evaluation

This document outlines the testing strategy for QueryLite using the **Pagila** sample database. Pagila provides a complex, real-world schema (DVD rental store) that is ideal for testing NL-to-SQL logic, relationship detection, and visualization.

## 1. Test Environment Setup

### Database Configuration
The Pagila instance is running via Docker with the following credentials:
- **Host**: `pagila_db` (inside Docker) or `localhost` (outside Docker)
- **Port**: `5433`
- **Database**: `pagila`
- **User**: `postgres`
- **Password**: `password123`

### Initialization Requirements
Ensure the following files are in `./pagila-init/` to properly populate the database:
1. `pagila-schema.sql` (Creates tables, views, and relationships)
2. `pagila-insert-data.sql` (Populates data)

## 2. Testing Goals

- [ ] **Relationship Detection**: Verify if `SchemaAnalyzer` correctly identifies FKs between `film`, `actor`, and `film_actor`.
- [ ] **Aggregation Accuracy**: Test `COUNT`, `SUM`, and `AVG` across rental and payment data.
- [ ] **Complex Joins**: Test multi-table joins (e.g., Customer -> Rental -> Inventory -> Film).
- [ ] **Visualization**: Verify if the system recommends "Bar" for counts and "Line/Area" for revenue trends.

## 3. Test Scenarios

### Level 1: Basic Retrieval (Sanity Check)
| Question | Expected Result |
| :--- | :--- |
| "List all films released in 2006" | SELECT * FROM film WHERE release_year = 2006 |
| "Show the names of all actors" | SELECT first_name, last_name FROM actor |

### Level 2: Joins & Categorization
| Question | Expected Result |
| :--- | :--- |
| "Show all films and their categories" | Joins `film`, `film_category`, and `category` |
| "List customers and their addresses" | Joins `customer` and `address` |

### Level 3: Aggregations & Grouping
| Question | Expected Result | Chart Recommendation |
| :--- | :--- | :--- |
| "How many films are in each category?" | `GROUP BY category_name`, `COUNT(*)` | **Bar Chart** |
| "What is the total revenue by store?" | Join `payment`, `rental`, `inventory`, `store`; `SUM(amount)` | **Bar/Donut Chart** |

### Level 4: Complex Business Logic
| Question | Expected Result |
| :--- | :--- |
| "Who are the top 10 customers by total amount spent?" | Join `customer` and `payment`; Order by `SUM(amount)` DESC |
| "Which category has the longest average film duration?" | Join `film`, `category`; `AVG(length)` GROUP BY category |

### Level 5: Time Series (Trend Analysis)
| Question | Expected Result | Chart Recommendation |
| :--- | :--- | :--- |
| "Show monthly rental count trends" | Extract month from `rental_date`; `COUNT(*)` | **Area/Line Chart** |

## 4. Verification Checklist

1. **Schema Check**:
   - Go to "Data Sources" -> "Add Source".
   - Use: `postgresql://postgres:password123@pagila_db:5432/pagila`
   - Verify that tables are listed correctly.
2. **Query Check**:
   - Run a Level 3 query.
   - Click "Explain" (if implemented) to see why the SQL was generated.
   - Verify the SQL uses proper JOIN syntax (e.g., `JOIN film_actor ON film.film_id = film_actor.film_id`).
3. **Chart Check**:
   - Ensure the X and Y axes are correctly mapped for Bar and Line charts.

## 5. Success Criteria
- QueryLite generates valid PostgreSQL syntax for at least 80% of the scenarios.
- The system correctly identifies the primary key and foreign key relationships without manual input.
- Large result sets (from Pagila data) are handled without timing out (testing the 30s timeout).
