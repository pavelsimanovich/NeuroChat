package com.ps.ollamaai.dto.converter;

import com.ps.ollamaai.domain.FileData;
import com.ps.ollamaai.dto.FileDataDto;
import org.springframework.stereotype.Component;

@Component
public class FileDataToDtoConverter {
    
    public FileDataDto convertToDto(FileData fileData) {
        if (fileData == null) {
            return null;
        }
        
        FileDataDto dto = new FileDataDto();
        dto.setId(fileData.getId());
        dto.setFileName(fileData.getFileName());
        dto.setContentType(fileData.getContentType());
        dto.setSize(fileData.getSize());
        dto.setCreatedAt(fileData.getCreatedAt());
        
        return dto;
    }
}
