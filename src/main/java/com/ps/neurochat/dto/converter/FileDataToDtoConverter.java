package com.ps.neurochat.dto.converter;

import com.ps.neurochat.domain.FileData;
import com.ps.neurochat.dto.FileDataDto;
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
