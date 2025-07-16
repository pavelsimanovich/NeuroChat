package com.ps.ollamaai.repository;

import com.ps.ollamaai.domain.FileData;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.LockModeType;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface FileDataRepository extends JpaRepository<FileData, String> {
    
    /**
     * Retrieves a file data entity with the specified ID and locks it for update
     * @param id the ID of the file data to retrieve
     * @return the file data entity
     * @throws EntityNotFoundException if no entity with the given ID exists
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT f FROM FileData f WHERE f.id = :id")
    FileData findByIdForUpdate(@Param("id") String id);
}
