package com.ps.ollamaai.service;

import com.ps.ollamaai.domain.FileData;
import com.ps.ollamaai.repository.FileDataRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileStorageService {

    private final FileDataRepository fileDataRepository;

    @Transactional
    public FileData storeFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be null or empty");
        }

        // Create a new transient entity
        FileData fileData = new FileData();
        fileData.setFileName(file.getOriginalFilename());
        fileData.setContentType(file.getContentType());
        fileData.setData(file.getBytes());
        fileData.setSize(file.getSize());
        
        // Save and return the managed entity
        return fileDataRepository.save(fileData);
    }

    public FileData getFile(String fileId) {
        return fileDataRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with id: " + fileId));
    }
}
