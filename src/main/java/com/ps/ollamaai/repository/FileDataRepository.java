package com.ps.ollamaai.repository;

import com.ps.ollamaai.domain.FileData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FileDataRepository extends JpaRepository<FileData, String> {
}
