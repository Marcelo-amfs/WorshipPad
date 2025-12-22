using Microsoft.AspNetCore.Mvc;

namespace WorshipPad.Controllers
{
    /// Controller responsável por gerenciar as requisições HTTP relacionadas ao WorshipPad. Fornece endpoints para obter arquivos de áudio e validar chaves musicais.
    [ApiController]
    [Route("api/[controller]")]
    public class WorshipPadController : ControllerBase
    {
        /// Serviço utilizado para obter caminhos de arquivos de áudio.
        private readonly WorshipPadService _worshipPadService;

        /// Construtor do controller que recebe a dependência do serviço.
        public WorshipPadController(WorshipPadService worshipPadService)
        {
            _worshipPadService = worshipPadService;
        }
        /// Endpoint GET para obter o arquivo de áudio correspondente a uma chave musical. Suporta streaming com range requests para melhor performance.
        [HttpGet("audio/{key}")]
        public IActionResult GetAudioFile(string key)
        {
            try
            {
                key = Uri.UnescapeDataString(key);
                
                if (string.IsNullOrEmpty(key) || key.Length > 3)
                {
                    return BadRequest(new { error = "Chave inválida" });
                }

                string normalizedKey = key.ToUpper();
                
                if (normalizedKey.EndsWith("M") && normalizedKey.Length > 1)
                {
                    if (normalizedKey.Length == 2 && normalizedKey[1] == 'M')
                    {
                        normalizedKey = normalizedKey[0] + "m";
                    }
                    else if (normalizedKey.Length == 3 && normalizedKey[1] == '#' && normalizedKey[2] == 'M')
                    {
                        normalizedKey = normalizedKey.Substring(0, 2) + "m";
                    }
                }
                
                key = normalizedKey;
                
                bool isValid = false;
                if (key.Length == 1)
                {
                    isValid = true;
                }
                else if (key.Length == 2)
                {
                    if (key[1] == '#' || key[1] == 'm')
                    {
                        isValid = true;
                    }
                }
                else if (key.Length == 3)
                {
                    if (key[1] == '#' && key[2] == 'm')
                    {
                        isValid = true;
                    }
                }
                
                if (!isValid)
                {
                    return BadRequest(new { error = "Chave inválida" });
                }

                string filePath = _worshipPadService.GetAudioFilePath(key);
                
                if (!System.IO.File.Exists(filePath))
                {
                    return NotFound(new { error = $"Arquivo não encontrado para a chave {key}" });
                }

                var fileBytes = System.IO.File.ReadAllBytes(filePath);
                var contentType = "audio/mpeg";
                
                return File(fileBytes, contentType, enableRangeProcessing: true);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// Endpoint POST para validar e preparar a reprodução de uma chave musical. Retorna informações sobre o arquivo de áudio disponível, incluindo a URL para streaming.
        [HttpPost("play/{key}")]
        public IActionResult PlayKey(string key)
        {
            try
            {
                key = Uri.UnescapeDataString(key);
                
                if (string.IsNullOrEmpty(key) || key.Length > 3)
                {
                    return BadRequest(new { error = "Chave inválida" });
                }

                string normalizedKey = key.ToUpper();
                
                if (normalizedKey.EndsWith("M") && normalizedKey.Length > 1)
                {
                    if (normalizedKey.Length == 2 && normalizedKey[1] == 'M')
                    {
                        normalizedKey = normalizedKey[0] + "m";
                    }
                    else if (normalizedKey.Length == 3 && normalizedKey[1] == '#' && normalizedKey[2] == 'M')
                    {
                        normalizedKey = normalizedKey.Substring(0, 2) + "m";
                    }
                }
                
                key = normalizedKey;
                
                bool isValid = false;
                if (key.Length == 1)
                {
                    isValid = true;
                }
                else if (key.Length == 2)
                {
                    if (key[1] == '#' || key[1] == 'm')
                    {
                        isValid = true;
                    }
                }
                else if (key.Length == 3)
                {
                    if (key[1] == '#' && key[2] == 'm')
                    {
                        isValid = true;
                    }
                }
                
                if (!isValid)
                {
                    return BadRequest(new { error = "Chave inválida" });
                }

                string filePath = _worshipPadService.GetAudioFilePath(key);
                if (!System.IO.File.Exists(filePath))
                {
                    return NotFound(new { error = $"Arquivo não encontrado para a chave {key}" });
                }

                return Ok(new { 
                    message = $"Arquivo disponível para {key}",
                    audioUrl = $"/api/WorshipPad/audio/{key}",
                    key = key
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}


