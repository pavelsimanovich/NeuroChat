package com.ps.neurochat.controller;

import com.ps.neurochat.domain.FileData;
import com.ps.neurochat.dto.FileDataDto;
import com.ps.neurochat.dto.converter.FileDataToDtoConverter;
import com.ps.neurochat.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileStorageService fileStorageService;
    private final FileDataToDtoConverter fileDataToDtoConverter;

    @PostMapping("/upload")
    public ResponseEntity<FileDataDto> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            final FileData fileData = fileStorageService.storeFile(file);
            final FileDataDto dto = fileDataToDtoConverter.convertToDto(fileData);
            return ResponseEntity.ok(dto);
        }  catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(null);
        }
    }

    @GetMapping("/{fileId}")
    public ResponseEntity<ByteArrayResource> downloadFile(@PathVariable String fileId) {
        final FileData fileData = fileStorageService.getFile(fileId);
        final ContentDisposition contentDisposition = ContentDisposition.attachment()
                .filename(fileData.getFileName(), StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(fileData.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition.toString())
                .body(new ByteArrayResource(fileData.getData()));
    }

    @GetMapping(value = "/{fileId}/preview", produces = MediaType.IMAGE_JPEG_VALUE)
    public ResponseEntity<byte[]> previewImage(@PathVariable String fileId) {
        final FileData fileData = fileStorageService.getFile(fileId);
        
        // Check if the file is an image
        if (!fileData.getContentType().startsWith("image/")) {
            return ResponseEntity.badRequest().build();
        }
        
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(fileData.getContentType()))
                .body(fileData.getData());
    }
}

