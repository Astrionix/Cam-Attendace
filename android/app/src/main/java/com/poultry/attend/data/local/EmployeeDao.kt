package com.poultry.attend.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface EmployeeDao {

    @Query("SELECT * FROM employees WHERE status = 'ACTIVE' ORDER BY name ASC")
    fun getAllActiveEmployeesFlow(): Flow<List<EmployeeEntity>>

    @Query("SELECT * FROM employees WHERE status = 'ACTIVE'")
    suspend fun getAllActiveEmployees(): List<EmployeeEntity>

    @Query("SELECT * FROM employees WHERE id = :id LIMIT 1")
    suspend fun getEmployeeById(id: String): EmployeeEntity?

    @Query("SELECT * FROM employees WHERE employeeCode = :code LIMIT 1")
    suspend fun getEmployeeByCode(code: String): EmployeeEntity?

    @Query("SELECT COUNT(*) FROM employees WHERE status = 'ACTIVE'")
    suspend fun getTotalActiveCount(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEmployee(employee: EmployeeEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEmployees(employees: List<EmployeeEntity>)

    @Update
    suspend fun updateEmployee(employee: EmployeeEntity)

    @Query("UPDATE employees SET status = 'INACTIVE' WHERE id = :id")
    suspend fun deactivateEmployee(id: String)

    @Query("DELETE FROM employees WHERE id = :id")
    suspend fun deleteEmployee(id: String)

    @Query("DELETE FROM employees WHERE id IN ('1', '2', '3', '4', '5') OR employeeCode LIKE 'PF-10%'")
    suspend fun deleteDemoEmployees()

    @Query("DELETE FROM employees")
    suspend fun deleteAllEmployees()
}
