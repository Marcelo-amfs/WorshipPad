using System;
using System.IO;
using Microsoft.AspNetCore.Mvc;
using WorshipPad.Interfaces;
using WorshipPad.Models;

namespace WorshipPad.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WorshipPadController : ControllerBase
    {
        private readonly IWorshipPadService _worshipPadService;

        public WorshipPadController(IWorshipPadService worshipPadService)
        {
            _worshipPadService = worshipPadService;
        }

        [HttpGet("audio/{key}")]
        [ProducesResponseType(typeof(FileResult), 200)]
        [ProducesResponseType(typeof(ErrorResponse), 400)]
        [ProducesResponseType(typeof(ErrorResponse), 404)]
        [ResponseCache(Duration = 31536000, Location = ResponseCacheLocation.Any)]
        public IActionResult GetAudioFile(string key)
        {
            try
            {
                key = Uri.UnescapeDataString(key);
                var (isValid, normalizedKey) = _worshipPadService.NormalizeAndValidateKey(key);
                
                if (!isValid)
                    return BadRequest(new ErrorResponse { Error = "Chave inválida" });

                string filePath = _worshipPadService.GetAudioFilePath(normalizedKey);
                
                if (!System.IO.File.Exists(filePath))
                    return NotFound(new ErrorResponse { Error = $"Arquivo não encontrado para a chave {normalizedKey}" });

                return PhysicalFile(filePath, "audio/mpeg", enableRangeProcessing: true);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ErrorResponse { Error = ex.Message });
            }
        }

        [HttpPost("play/{key}")]
        [ProducesResponseType(typeof(PlayResponse), 200)]
        [ProducesResponseType(typeof(ErrorResponse), 400)]
        [ProducesResponseType(typeof(ErrorResponse), 404)]
        public IActionResult PlayKey(string key)
        {
            try
            {
                key = Uri.UnescapeDataString(key);
                var (isValid, normalizedKey) = _worshipPadService.NormalizeAndValidateKey(key);
                
                if (!isValid)
                    return BadRequest(new ErrorResponse { Error = "Chave inválida" });

                string filePath = _worshipPadService.GetAudioFilePath(normalizedKey);
                
                if (!System.IO.File.Exists(filePath))
                    return NotFound(new ErrorResponse { Error = $"Arquivo não encontrado para a chave {normalizedKey}" });

                return Ok(new PlayResponse 
                { 
                    Message = $"Arquivo disponível para {normalizedKey}",
                    AudioUrl = $"/api/WorshipPad/audio/{normalizedKey}",
                    Key = normalizedKey
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ErrorResponse { Error = ex.Message });
            }
        }
    }
}


