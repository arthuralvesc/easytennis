package com.easytennis.controller;

import com.easytennis.dto.costsplit.CostSplitRequest;
import com.easytennis.dto.costsplit.CostSplitResponse;
import com.easytennis.service.CostSplitService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/cost-split")
@RequiredArgsConstructor
public class CostSplitController {

    private final CostSplitService costSplitService;

    @PostMapping
    public ResponseEntity<CostSplitResponse> calculate(@RequestBody @Valid CostSplitRequest request) {
        return ResponseEntity.ok(costSplitService.calculate(request));
    }
}
